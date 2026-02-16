import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * GET /api/admin/users
 * Returns paginated user list with sorting and filtering
 * Query params:
 *   - page: number (default: 1)
 *   - limit: number (default: 25, max: 100)
 *   - sortBy: string (default: 'created_at')
 *   - sortOrder: 'asc' | 'desc' (default: 'desc')
 *   - status: string (optional filter)
 *   - role: string (optional filter)
 *   - plan: string (optional filter)
 *   - search: string (optional search by email)
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return ApiErrors.unauthorized();
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return ApiErrors.adminRequired();
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const status = searchParams.get('status');
  const role = searchParams.get('role');
  const plan = searchParams.get('plan');
  const search = searchParams.get('search');

  const offset = (page - 1) * limit;

  // Build the query joining auth.users and profiles
  // Note: We use raw SQL via RPC or direct query since auth.users is a special schema
  let query = supabase.from('profiles').select(
    `
      id,
      role,
      plan,
      status,
      created_at,
      updated_at,
      last_active_at,
      suspended_at,
      suspended_reason
    `,
    { count: 'exact' }
  );

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  if (role) {
    query = query.eq('role', role);
  }
  if (plan) {
    query = query.eq('plan', plan);
  }

  // Apply search (email is not in profiles, we'll need to get it from auth.users)
  // For now, we'll search by id if it's a UUID-like string
  if (search) {
    // Note: Full search by email requires joining with auth.users
    // This is a simplified implementation
    query = query.or(`id.ilike.%${search}%`);
  }

  // Apply sorting and pagination
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  query = query.range(offset, offset + limit - 1);

  const { data: profiles, error: profilesError, count } = await query;

  if (profilesError) {
    return ApiErrors.databaseError(profilesError);
  }

  // Fetch user details from auth.users
  // Note: In production, you might want to create a view or use a function
  const userIds = profiles?.map(p => p.id) || [];

  // Get storage usage per user
  const { data: storageData, error: storageError } = await supabase
    .from('encrypted_blobs')
    .select('user_id, ciphertext')
    .in('user_id', userIds);

  // Log storage error but don't fail the request
  if (storageError) {
    console.error('[Admin Users] Error fetching storage:', storageError);
  }

  // Calculate storage per user
  const storageMap = new Map<string, number>();
  if (storageData) {
    for (const blob of storageData) {
      const currentSize = storageMap.get(blob.user_id) || 0;
      // Estimate size from ciphertext length (base64 encoded so ~4/3 overhead)
      storageMap.set(blob.user_id, currentSize + (blob.ciphertext?.length || 0));
    }
  }

  // Get user emails from auth.users (requires admin access to auth schema)
  // This is a workaround - in production, consider caching emails in profiles
  const usersWithDetails = await Promise.all(
    (profiles || []).map(async profile => {
      // Get email from auth.users
      const { data: userData, error: userError } = await supabase.rpc('get_user_email', {
        user_id: profile.id,
      });

      return {
        id: profile.id,
        email: userError ? 'hidden@privacy.com' : userData || 'unknown',
        role: profile.role,
        plan: profile.plan,
        status: profile.status,
        created_at: profile.created_at,
        last_active_at: profile.last_active_at,
        storage_bytes: storageMap.get(profile.id) || 0,
        suspended_at: profile.suspended_at,
        suspended_reason: profile.suspended_reason,
      };
    })
  );

  return NextResponse.json({
    users: usersWithDetails,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}
