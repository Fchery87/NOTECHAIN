import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/sessions/[id]/revoke
 * Revokes a specific session (force logout)
 * Requires admin role
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: sessionId } = await params;

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

    // Parse request body for reason
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Call the database function to revoke the session
    const { data: result, error: revokeError } = await supabase.rpc('revoke_user_session', {
      p_session_id: sessionId,
      p_reason: reason || 'Revoked by admin',
    });

    if (revokeError) {
      console.error('[Admin Revoke Session] Error:', revokeError);
      return NextResponse.json({ error: revokeError.message }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Revoke Session] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
