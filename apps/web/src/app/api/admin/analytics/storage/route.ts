import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Call the database function to get storage analytics
    const { data: analytics, error: analyticsError } = await supabase.rpc('get_storage_analytics');

    if (analyticsError) {
      console.error('[Admin Storage Analytics] Error:', analyticsError);
      return NextResponse.json({ error: 'Failed to fetch storage analytics' }, { status: 500 });
    }

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('[Admin Storage Analytics] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
