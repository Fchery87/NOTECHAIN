-- Migration: 011_admin_dashboard_functions.sql
-- Helper functions for audit logging and admin operations
-- Date: 2026-02-15

-- ============================================
-- AUDIT LOGGING FUNCTIONS
-- ============================================

-- Function: Create audit log entry
-- Usage: SELECT create_audit_log('user.role.updated', 'user', user_id, old_val, new_val);
CREATE OR REPLACE FUNCTION create_audit_log(
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50),
    p_resource_id UUID,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_severity VARCHAR(20) DEFAULT 'info',
    p_status VARCHAR(20) DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL,
    p_affected_count INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    v_actor_id UUID;
    v_actor_email VARCHAR(255);
    v_audit_id UUID;
BEGIN
    -- Get current user info
    v_actor_id := auth.uid();
    
    -- Get actor email for forensics
    SELECT email INTO v_actor_email
    FROM auth.users
    WHERE id = v_actor_id;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        actor_id,
        actor_email,
        action,
        resource_type,
        resource_id,
        old_value,
        new_value,
        severity,
        status,
        error_message,
        affected_count
    ) VALUES (
        v_actor_id,
        v_actor_email,
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_value,
        p_new_value,
        p_severity::audit_severity,
        p_status::audit_status,
        p_error_message,
        p_affected_count
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_audit_log IS 'Creates an audit log entry for administrative actions';

-- Function: Update user role with audit logging
-- Usage: SELECT update_user_role(user_id, 'admin', 'Promoting to admin');
CREATE OR REPLACE FUNCTION update_user_role(
    p_user_id UUID,
    p_new_role user_role,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old_role user_role;
    v_admin_id UUID;
    v_result JSONB;
BEGIN
    v_admin_id := auth.uid();
    
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can update user roles';
    END IF;
    
    -- Get current role
    SELECT role INTO v_old_role
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_old_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Update role
    UPDATE profiles
    SET 
        role = p_new_role,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create audit log
    PERFORM create_audit_log(
        'user.role.updated',
        'user',
        p_user_id,
        jsonb_build_object('role', v_old_role),
        jsonb_build_object('role', p_new_role, 'reason', p_reason),
        CASE WHEN p_new_role = 'admin' THEN 'warning' ELSE 'info' END
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'old_role', v_old_role,
        'new_role', p_new_role
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_role IS 'Updates a user role with full audit logging. Requires admin privileges.';

-- Function: Update user status with audit logging
-- Usage: SELECT update_user_status(user_id, 'suspended', 'Violation of terms');
CREATE OR REPLACE FUNCTION update_user_status(
    p_user_id UUID,
    p_new_status user_status,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old_status user_status;
    v_admin_id UUID;
    v_result JSONB;
BEGIN
    v_admin_id := auth.uid();
    
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can update user status';
    END IF;
    
    -- Get current status
    SELECT status INTO v_old_status
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Update status with suspension metadata if suspending
    UPDATE profiles
    SET 
        status = p_new_status,
        updated_at = NOW(),
        suspended_at = CASE WHEN p_new_status = 'suspended' THEN NOW() ELSE suspended_at END,
        suspended_reason = CASE WHEN p_new_status = 'suspended' THEN p_reason ELSE suspended_reason END,
        suspended_by = CASE WHEN p_new_status = 'suspended' THEN v_admin_id ELSE suspended_by END
    WHERE id = p_user_id;
    
    -- Create audit log
    PERFORM create_audit_log(
        'user.status.updated',
        'user',
        p_user_id,
        jsonb_build_object('status', v_old_status),
        jsonb_build_object(
            'status', p_new_status, 
            'reason', p_reason,
            'suspended_by', v_admin_id
        ),
        CASE 
            WHEN p_new_status = 'suspended' THEN 'critical'
            WHEN v_old_status = 'suspended' AND p_new_status = 'active' THEN 'warning'
            ELSE 'info'
        END
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'old_status', v_old_status,
        'new_status', p_new_status,
        'reason', p_reason
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_status IS 'Updates a user status with full audit logging. Requires admin privileges.';

-- ============================================
-- ADMIN DASHBOARD STATS FUNCTIONS
-- ============================================

-- Function: Get admin dashboard overview stats
-- Usage: SELECT * FROM get_admin_stats();
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_users BIGINT;
    v_active_users_7d BIGINT;
    v_total_storage BIGINT;
    v_total_sync_ops BIGINT;
    v_failed_sync_ops BIGINT;
    v_suspended_users BIGINT;
    v_recent_audit_logs BIGINT;
    v_result JSONB;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view dashboard stats';
    END IF;
    
    -- Total users
    SELECT COUNT(*) INTO v_total_users FROM profiles;
    
    -- Active users (last 7 days)
    SELECT COUNT(*) INTO v_active_users_7d 
    FROM auth.users 
    WHERE last_sign_in_at > NOW() - INTERVAL '7 days';
    
    -- Total storage used (from encrypted_blobs)
    SELECT COALESCE(SUM(octet_length(ciphertext)), 0) INTO v_total_storage 
    FROM encrypted_blobs;
    
    -- Total sync operations
    SELECT COUNT(*) INTO v_total_sync_ops FROM encrypted_blobs;
    
    -- Suspended users
    SELECT COUNT(*) INTO v_suspended_users 
    FROM profiles 
    WHERE status = 'suspended';
    
    -- Recent audit logs (last 24h)
    SELECT COUNT(*) INTO v_recent_audit_logs 
    FROM audit_logs 
    WHERE created_at > NOW() - INTERVAL '24 hours';
    
    v_result := jsonb_build_object(
        'total_users', v_total_users,
        'active_users_7d', v_active_users_7d,
        'total_storage_bytes', v_total_storage,
        'total_storage_mb', ROUND(v_total_storage::numeric / 1024 / 1024, 2),
        'total_sync_operations', v_total_sync_ops,
        'suspended_users', v_suspended_users,
        'recent_audit_logs_24h', v_recent_audit_logs,
        'active_user_percentage', CASE 
            WHEN v_total_users > 0 THEN ROUND((v_active_users_7d::numeric / v_total_users) * 100, 1)
            ELSE 0
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_admin_stats IS 'Returns admin dashboard overview statistics. Requires admin privileges.';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get user email from auth.users
-- Usage: SELECT get_user_email('user-uuid');
-- Note: This requires proper permissions on auth schema
CREATE OR REPLACE FUNCTION get_user_email(p_user_id UUID)
RETURNS VARCHAR(255) AS $$
DECLARE
    v_email VARCHAR(255);
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view user emails';
    END IF;
    
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = p_user_id;
    
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_email IS 'Retrieves a user email from auth.users. Requires admin privileges.';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION create_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email TO authenticated;
