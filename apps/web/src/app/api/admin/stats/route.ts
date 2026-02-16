import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * GET /api/admin/stats
 * Returns admin dashboard overview statistics
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

  // Call the database function to get stats (v2 includes sync metrics)
  const { data: stats, error: statsError } = await supabase.rpc('get_admin_stats_v2');

  if (statsError) {
    return ApiErrors.databaseError(statsError);
  }

  return NextResponse.json(stats);
}
