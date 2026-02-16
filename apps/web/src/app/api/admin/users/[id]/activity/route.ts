import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/users/[id]/activity
 * Returns comprehensive user activity details
 * Requires admin role
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: userId } = await params;

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

    // Call the database function to get user activity details
    const { data: activityDetails, error: detailsError } = await supabase.rpc(
      'get_user_activity_details',
      {
        p_user_id: userId,
      }
    );

    if (detailsError) {
      console.error('[Admin User Activity] Error:', detailsError);
      return NextResponse.json({ error: 'Failed to fetch user activity details' }, { status: 500 });
    }

    return NextResponse.json(activityDetails);
  } catch (error) {
    console.error('[Admin User Activity] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
