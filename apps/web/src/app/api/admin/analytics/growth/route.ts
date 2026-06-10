import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * GET /api/admin/analytics/growth
 * Returns user growth data over time for charting
 * Query params:
 *   - days: number (default: 30, max: 365)
 * Requires admin role
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30')));

    // Call the database function to get user growth
    const { data: growth, error: growthError } = await supabase.rpc('get_user_growth', {
      p_days: days,
    });

    if (growthError) {
      return ApiErrors.databaseError(growthError);
    }

    return NextResponse.json({ growth: growth || [] });
  } catch (error) {
    return ApiErrors.internalError(error);
  }
}
