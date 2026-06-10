import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

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

    // Call the database function to get user activity details
    const { data: activityDetails, error: detailsError } = await supabase.rpc(
      'get_user_activity_details',
      {
        p_user_id: userId,
      }
    );

    if (detailsError) {
      return ApiErrors.databaseError(detailsError);
    }

    return NextResponse.json(activityDetails);
  } catch (error) {
    return ApiErrors.internalError(error);
  }
}
