import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30')));

    // Call the database function to get user growth
    const { data: growth, error: growthError } = await supabase.rpc('get_user_growth', {
      p_days: days,
    });

    if (growthError) {
      console.error('[Admin Growth Analytics] Error:', growthError);
      return NextResponse.json({ error: 'Failed to fetch growth data' }, { status: 500 });
    }

    return NextResponse.json({ growth: growth || [] });
  } catch (error) {
    console.error('[Admin Growth Analytics] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
