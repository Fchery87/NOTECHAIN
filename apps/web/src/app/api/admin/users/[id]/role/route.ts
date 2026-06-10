import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';
import { withCSRFWithParams } from '@/lib/security/withCSRF';
import { withRateLimitAndParams } from '@/lib/security/serverRateLimiter';

/**
 * POST /api/admin/users/[id]/role
 * Updates a user's role with audit logging
 * Body: { role: 'user' | 'moderator' | 'admin', reason?: string }
 * Requires owner role
 * Rate limiting: 100 requests per minute (api limiter)
 */
const handler = withCSRFWithParams(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

    // Only the owner can grant/revoke app roles. Admins can manage operations,
    // but cannot create other admins.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'owner') {
      return ApiErrors.forbidden('Only the owner can grant or revoke user roles');
    }

    // Parse request body
    let body: { role?: string; reason?: string };
    try {
      body = await request.json();
    } catch {
      return ApiErrors.invalidInput('body', 'Invalid JSON body');
    }

    const { role, reason } = body;

    // Validate role
    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      return ApiErrors.validationError({
        field: 'role',
        allowed: ['user', 'moderator', 'admin'],
      });
    }

    // Call the database function to update role with audit logging
    const { data: result, error: updateError } = await supabase.rpc('update_user_role', {
      p_user_id: userId,
      p_new_role: role,
      p_reason: reason || null,
    });

    if (updateError) {
      return ApiErrors.databaseError(updateError);
    }

    return NextResponse.json(result);
  }
);

export const POST = withRateLimitAndParams(handler, 'api');
