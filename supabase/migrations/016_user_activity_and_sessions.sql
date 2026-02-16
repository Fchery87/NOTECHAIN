-- Migration: 016_user_activity_and_sessions.sql
-- User activity timeline and session management for admin dashboard
-- Date: 2026-02-15

-- ============================================
-- USER ACTIVITY TIMELINE FUNCTIONS
-- ============================================

-- Function: Get comprehensive user activity details
-- Usage: SELECT * FROM get_user_activity_details('user-uuid');
CREATE OR REPLACE FUNCTION get_user_activity_details(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_profile JSONB;
    v_auth_info JSONB;
    v_storage_stats JSONB;
    v_sync_history JSONB;
    v_audit_history JSONB;
    v_recent_devices JSONB;
    v_result JSONB;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view user activity details';
    END IF;

    -- Get profile info
    SELECT jsonb_build_object(
        'id', id,
        'role', role,
        'plan', plan,
        'status', status,
        'created_at', created_at,
        'updated_at', updated_at,
        'last_active_at', last_active_at,
        'suspended_at', suspended_at,
        'suspended_reason', suspended_reason,
        'metadata', metadata
    ) INTO v_user_profile
    FROM profiles
    WHERE id = p_user_id;

    IF v_user_profile IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get auth info (requires admin access to auth schema)
    SELECT jsonb_build_object(
        'email', email,
        'email_confirmed_at', email_confirmed_at,
        'last_sign_in_at', last_sign_in_at,
        'created_at', created_at,
        'confirmed_at', confirmed_at
    ) INTO v_auth_info
    FROM auth.users
    WHERE id = p_user_id;

    -- Get storage statistics
    SELECT jsonb_build_object(
        'total_blobs', COUNT(*),
        'total_bytes', COALESCE(SUM(octet_length(ciphertext)), 0),
        'total_mb', ROUND(COALESCE(SUM(octet_length(ciphertext)), 0)::numeric / 1024 / 1024, 2),
        'oldest_blob', MIN(created_at),
        'newest_blob', MAX(created_at)
    ) INTO v_storage_stats
    FROM encrypted_blobs
    WHERE user_id = p_user_id;

    -- Get sync history (last 20 syncs)
    SELECT jsonb_agg(jsonb_build_object(
        'device_id', device_id,
        'last_sync_version', last_sync_version,
        'sync_status', sync_status,
        'last_synced_at', last_synced_at,
        'created_at', created_at
    ) ORDER BY last_synced_at DESC)
    INTO v_sync_history
    FROM (
        SELECT *
        FROM sync_metadata
        WHERE user_id = p_user_id
        ORDER BY last_synced_at DESC
        LIMIT 20
    ) recent_syncs;

    -- Get audit history for this user (actions targeting them)
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'action', action,
        'actor_email', actor_email,
        'old_value', old_value,
        'new_value', new_value,
        'severity', severity,
        'status', status,
        'created_at', created_at
    ) ORDER BY created_at DESC)
    INTO v_audit_history
    FROM (
        SELECT *
        FROM audit_logs
        WHERE resource_id = p_user_id
           OR (new_value->>'user_id')::uuid = p_user_id
        ORDER BY created_at DESC
        LIMIT 50
    ) user_logs;

    -- Get recent devices
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'device_name', device_name,
        'device_type', device_type,
        'last_synced_at', last_synced_at,
        'created_at', created_at
    ) ORDER BY last_synced_at DESC)
    INTO v_recent_devices
    FROM (
        SELECT d.id, d.device_name, d.device_type, sm.last_synced_at, d.created_at
        FROM devices d
        LEFT JOIN sync_metadata sm ON d.id = sm.device_id AND sm.user_id = p_user_id
        WHERE d.user_id = p_user_id
        ORDER BY sm.last_synced_at DESC NULLS LAST
        LIMIT 10
    ) user_devices;

    v_result := jsonb_build_object(
        'profile', v_user_profile,
        'auth', v_auth_info,
        'storage', COALESCE(v_storage_stats, '{}'::jsonb),
        'sync_history', COALESCE(v_sync_history, '[]'::jsonb),
        'audit_history', COALESCE(v_audit_history, '[]'::jsonb),
        'devices', COALESCE(v_recent_devices, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_activity_details IS 'Returns comprehensive user activity details for admin timeline view. Requires admin privileges.';

-- ============================================
-- SESSION MANAGEMENT
-- ============================================

-- Table to track active admin sessions (for force logout feature)
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id)
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(user_id, is_revoked) WHERE is_revoked = FALSE;

-- RLS for admin_sessions
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON admin_sessions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can revoke sessions
CREATE POLICY "Admins can revoke sessions"
ON admin_sessions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Function: Get active sessions for a user
-- Usage: SELECT * FROM get_user_sessions('user-uuid');
CREATE OR REPLACE FUNCTION get_user_sessions(p_user_id UUID)
RETURNS TABLE (
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    created_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_current_session BOOLEAN
) AS $$
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view user sessions';
    END IF;

    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.ip_address,
        s.user_agent,
        s.device_info,
        s.created_at,
        s.last_active_at,
        s.expires_at,
        (s.session_token = current_setting('request.headers', true)::json->>'x-session-token') as is_current_session
    FROM admin_sessions s
    WHERE s.user_id = p_user_id
    AND s.is_revoked = FALSE
    AND s.expires_at > NOW()
    ORDER BY s.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Revoke a user session (force logout)
-- Usage: SELECT revoke_user_session('session-uuid', 'reason');
CREATE OR REPLACE FUNCTION revoke_user_session(
    p_session_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    v_admin_id := auth.uid();

    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can revoke sessions';
    END IF;

    -- Get user_id for audit log
    SELECT user_id INTO v_user_id
    FROM admin_sessions
    WHERE id = p_session_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- Revoke the session
    UPDATE admin_sessions
    SET 
        is_revoked = TRUE,
        revoked_at = NOW(),
        revoked_by = v_admin_id
    WHERE id = p_session_id;

    -- Create audit log
    PERFORM create_audit_log(
        'user.session.revoked',
        'session',
        p_session_id,
        jsonb_build_object('user_id', v_user_id, 'reason', p_reason),
        jsonb_build_object('status', 'revoked', 'admin_id', v_admin_id),
        'warning'
    );

    v_result := jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'user_id', v_user_id,
        'revoked_at', NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_user_session IS 'Revokes a user session (force logout). Requires admin privileges.';

-- Function: Revoke all sessions for a user
-- Usage: SELECT revoke_all_user_sessions('user-uuid', 'Security violation');
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID;
    v_revoked_count INTEGER;
    v_result JSONB;
BEGIN
    v_admin_id := auth.uid();

    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can revoke sessions';
    END IF;

    -- Revoke all active sessions
    UPDATE admin_sessions
    SET 
        is_revoked = TRUE,
        revoked_at = NOW(),
        revoked_by = v_admin_id
    WHERE user_id = p_user_id
    AND is_revoked = FALSE;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    -- Create audit log
    PERFORM create_audit_log(
        'user.sessions.revoked_all',
        'user',
        p_user_id,
        NULL,
        jsonb_build_object(
            'revoked_count', v_revoked_count,
            'reason', p_reason,
            'admin_id', v_admin_id
        ),
        'critical'
    );

    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'revoked_count', v_revoked_count,
        'reason', p_reason
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_all_user_sessions IS 'Revokes all sessions for a user (force logout everywhere). Requires admin privileges.';

-- ============================================
-- NOTIFICATION SYSTEM FOR CRITICAL EVENTS
-- ============================================

-- Table for admin notification settings
CREATE TABLE IF NOT EXISTS admin_notification_settings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email_notifications BOOLEAN DEFAULT TRUE,
    slack_webhook_url TEXT,
    notify_on_critical BOOLEAN DEFAULT TRUE,
    notify_on_suspension BOOLEAN DEFAULT TRUE,
    notify_on_bulk_operation BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id)
);

-- RLS for notification settings
ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own notification settings"
ON admin_notification_settings FOR ALL
TO authenticated
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());

-- Function: Queue critical notification
-- Usage: SELECT queue_admin_notification('user.suspended', '{"user_id": "..."}'::jsonb);
CREATE OR REPLACE FUNCTION queue_admin_notification(
    p_event_type VARCHAR(100),
    p_event_data JSONB,
    p_severity VARCHAR(20) DEFAULT 'warning'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- This function would typically insert into a queue table
    -- For now, we just log it and return an ID
    -- In production, this would trigger a webhook/email service
    
    PERFORM create_audit_log(
        'admin.notification.queued',
        'notification',
        NULL,
        NULL,
        jsonb_build_object(
            'event_type', p_event_type,
            'event_data', p_event_data,
            'severity', p_severity
        ),
        p_severity::audit_severity
    );

    RETURN extensions.uuid_generate_v4();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-queue notifications on critical events
CREATE OR REPLACE FUNCTION trigger_critical_event_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue notification for critical events
    IF NEW.severity IN ('warning', 'critical') THEN
        PERFORM queue_admin_notification(
            NEW.action,
            jsonb_build_object(
                'actor_id', NEW.actor_id,
                'actor_email', NEW.actor_email,
                'resource_type', NEW.resource_type,
                'resource_id', NEW.resource_id,
                'severity', NEW.severity
            ),
            NEW.severity::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on audit_logs
DROP TRIGGER IF EXISTS critical_event_notification ON audit_logs;
CREATE TRIGGER critical_event_notification
    AFTER INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_critical_event_notification();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_activity_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_all_user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION queue_admin_notification TO authenticated;

GRANT SELECT, INSERT, UPDATE ON admin_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_notification_settings TO authenticated;
