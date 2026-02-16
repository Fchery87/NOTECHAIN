import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * GET /api/admin/audit-logs
 * Returns audit logs with filtering and pagination
 * Query params:
 *   - page: number (default: 1)
 *   - limit: number (default: 50, max: 100)
 *   - action: string (optional filter by action type)
 *   - severity: 'info' | 'warning' | 'critical' (optional filter)
 *   - resourceType: string (optional filter)
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - actorId: UUID (optional filter by actor)
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
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const action = searchParams.get('action');
  const severity = searchParams.get('severity');
  const resourceType = searchParams.get('resourceType');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const actorId = searchParams.get('actorId');

  const offset = (page - 1) * limit;

  // Build the query
  let query = supabase.from('audit_logs').select('*', { count: 'exact' });

  // Apply filters
  if (action) {
    query = query.eq('action', action);
  }
  if (severity) {
    query = query.eq('severity', severity);
  }
  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }
  if (actorId) {
    query = query.eq('actor_id', actorId);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  // Apply sorting and pagination
  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data: logs, error: logsError, count } = await query;

  if (logsError) {
    return ApiErrors.databaseError(logsError);
  }

  return NextResponse.json({
    logs: logs || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}
