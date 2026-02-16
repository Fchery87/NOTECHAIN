import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api/errors';

/**
 * POST /api/admin/users/[id]/status
 * Updates a user's status with audit logging
 * Body: { status: 'active' | 'suspended' | 'inactive', reason?: string }
 * Requires admin role
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // Parse request body
  let body: { status?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return ApiErrors.invalidInput('body', 'Invalid JSON body');
  }

  const { status, reason } = body;

  // Validate status
  if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
    return ApiErrors.validationError({
      field: 'status',
      allowed: ['active', 'suspended', 'inactive'],
    });
  }

  // Require reason for suspension
  if (status === 'suspended' && !reason) {
    return ApiErrors.missingField('reason');
  }

  // Call the database function to update status with audit logging
  const { data: result, error: updateError } = await supabase.rpc('update_user_status', {
    p_user_id: userId,
    p_new_status: status,
    p_reason: reason || null,
  });

  if (updateError) {
    return ApiErrors.databaseError(updateError);
  }

  return NextResponse.json(result);
}
