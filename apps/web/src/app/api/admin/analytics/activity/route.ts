import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * GET /api/admin/analytics/activity
 * Returns DAU/WAU/MAU metrics
 * Requires admin role
 */
export async function GET() {
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

  // Call the database function to get activity metrics
  const { data: metrics, error: metricsError } = await supabase.rpc('get_user_activity_metrics');

  if (metricsError) {
    return ApiErrors.databaseError(metricsError);
  }

  return NextResponse.json(metrics);
}
