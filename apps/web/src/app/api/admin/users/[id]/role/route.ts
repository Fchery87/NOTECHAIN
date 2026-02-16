import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * POST /api/admin/users/[id]/role
 * Updates a user's role with audit logging
 * Body: { role: 'user' | 'moderator' | 'admin', reason?: string }
 * Requires admin role
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id: userId } = await params;

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

  // Parse request body
  let body: { role?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return ApiErrors.invalidInput('body', 'Invalid JSON body');
  }

  const { role, reason } = body;

  // Validate role
  if (!role || !['user', 'moderator', 'admin'].includes(role)) {
    return ApiErrors.validationError({
      field: 'role',
      allowed: ['user', 'moderator', 'admin'],
    });
  }

  // Call the database function to update role with audit logging
  const { data: result, error: updateError } = await supabase.rpc('update_user_role', {
    p_user_id: userId,
    p_new_role: role,
    p_reason: reason || null,
  });

  if (updateError) {
    return ApiErrors.databaseError(updateError);
  }

  return NextResponse.json(result);
}
