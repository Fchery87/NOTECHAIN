import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * POST /api/admin/users/[id]/sessions/revoke-all
 * Revokes all sessions for a user (force logout everywhere)
 * Requires admin role
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    if (profileError || profile?.role !== 'admin') {
      return ApiErrors.adminRequired();
    }

    // Parse request body for reason
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Call the database function to revoke all sessions
    const { data: result, error: revokeError } = await supabase.rpc('revoke_all_user_sessions', {
      p_user_id: userId,
      p_reason: reason || 'All sessions revoked by admin',
    });

    if (revokeError) {
      return ApiErrors.databaseError(revokeError);
    }

    return NextResponse.json(result);
  } catch (error) {
    return ApiErrors.internalError(error);
  }
}
