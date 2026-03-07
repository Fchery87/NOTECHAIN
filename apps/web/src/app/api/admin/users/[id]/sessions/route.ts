import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * GET /api/admin/users/[id]/sessions
 * Returns active sessions for a user
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

    if (profileError || profile?.role !== 'admin') {
      return ApiErrors.adminRequired();
    }

    // Call the database function to get user sessions
    const { data: sessions, error: sessionsError } = await supabase.rpc('get_user_sessions', {
      p_user_id: userId,
    });

    if (sessionsError) {
      return ApiErrors.databaseError(sessionsError);
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    return ApiErrors.internalError(error);
  }
}
