import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * GET /api/admin/analytics/storage
 * Returns storage analytics including top consumers
 * Requires admin role
 */
export async function GET() {
  try {
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

    if (profileError || !['admin', 'owner'].includes(profile?.role || '')) {
      return ApiErrors.adminRequired();
    }

    // Call the database function to get storage analytics
    const { data: analytics, error: analyticsError } = await supabase.rpc('get_storage_analytics');

    if (analyticsError) {
      return ApiErrors.databaseError(analyticsError);
    }

    return NextResponse.json(analytics);
  } catch (error) {
    return ApiErrors.internalError(error);
  }
}
