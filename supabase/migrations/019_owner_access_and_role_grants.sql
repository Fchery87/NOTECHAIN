-- Migration: 018_owner_access_and_role_grants.sql
-- Makes fchery87@gmail.com the sole owner and restricts admin grants to owner.

-- ============================================
-- OWNER / ADMIN HELPERS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_owner(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = user_id AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = user_id AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ============================================
-- SEED THE SINGLE OWNER ACCOUNT
-- ============================================

UPDATE public.profiles AS p
SET
    role = 'owner',
    plan = 'enterprise',
    status = 'active',
    metadata = COALESCE(p.metadata, '{}'::jsonb) || jsonb_build_object('owner', true),
    updated_at = NOW()
FROM auth.users AS u
WHERE p.id = u.id
  AND lower(u.email) = lower('fchery87@gmail.com');

-- Enforce that NoteChain has exactly one root owner at most. The application never
-- grants owner; any future owner rotation must be done as direct database SQL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_owner
    ON public.profiles (role)
    WHERE role = 'owner';

-- ============================================
-- PROTECT PRIVILEGED PROFILE FIELDS FROM DIRECT CLIENT UPDATES
-- ============================================

CREATE OR REPLACE FUNCTION public.enforce_profile_privilege_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_is_admin BOOLEAN;
    v_actor_is_owner BOOLEAN;
BEGIN
    v_actor_id := auth.uid();

    -- Direct database owner / migration execution does not have a Supabase auth uid.
    -- Allow it so controlled SQL can recover or rotate the owner if ever required.
    IF v_actor_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_actor_is_admin := public.is_admin(v_actor_id);
    v_actor_is_owner := public.is_owner(v_actor_id);

    -- Only the owner can change roles. The owner role itself is controlled by
    -- migrations/manual SQL, not by the in-app admin UI.
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT v_actor_is_owner THEN
            RAISE EXCEPTION 'Only the owner can change user roles' USING ERRCODE = '42501';
        END IF;

        IF NEW.role = 'owner' THEN
            RAISE EXCEPTION 'Owner role must be granted by controlled migration or direct database owner action' USING ERRCODE = '42501';
        END IF;

        IF OLD.role = 'owner' THEN
            RAISE EXCEPTION 'Owner role cannot be changed from the application' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Plans unlock paid/enterprise capability, so only the owner should change them
    -- until a billing system owns this transition.
    IF OLD.plan IS DISTINCT FROM NEW.plan AND NOT v_actor_is_owner THEN
        RAISE EXCEPTION 'Only the owner can change user plans' USING ERRCODE = '42501';
    END IF;

    -- Admins and the owner can suspend/reactivate users.
    IF (
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.suspended_at IS DISTINCT FROM NEW.suspended_at OR
        OLD.suspended_reason IS DISTINCT FROM NEW.suspended_reason OR
        OLD.suspended_by IS DISTINCT FROM NEW.suspended_by
    ) AND NOT v_actor_is_admin THEN
        RAISE EXCEPTION 'Admin access required to change account status' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_profile_privilege_changes ON public.profiles;
CREATE TRIGGER enforce_profile_privilege_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_privilege_changes();

-- ============================================
-- RECREATE PROFILE/AUDIT/SESSION POLICIES TO TREAT OWNER AS ADMIN
-- ============================================

DROP POLICY IF EXISTS "admins_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.profiles;

CREATE POLICY "admins_view_all_profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Privileged profile changes are guarded by enforce_profile_privilege_changes().
-- Keeping this policy allows admins to perform non-role management updates when needed,
-- while role/plan/status changes are independently checked by the trigger.
CREATE POLICY "admins_update_all_profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.admin_sessions;
CREATE POLICY "Admins can view all sessions"
    ON public.admin_sessions
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can revoke sessions" ON public.admin_sessions;
CREATE POLICY "Admins can revoke sessions"
    ON public.admin_sessions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- ADMIN ROLE MANAGEMENT: OWNER ONLY
-- ============================================

CREATE OR REPLACE FUNCTION public.update_user_role(
    p_user_id UUID,
    p_new_role user_role,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old_role user_role;
    v_owner_id UUID;
    v_result JSONB;
BEGIN
    v_owner_id := auth.uid();

    IF NOT public.is_owner(v_owner_id) THEN
        RAISE EXCEPTION 'Only the owner can update user roles' USING ERRCODE = '42501';
    END IF;

    IF p_new_role = 'owner' THEN
        RAISE EXCEPTION 'Owner role cannot be granted from the application' USING ERRCODE = '42501';
    END IF;

    SELECT role INTO v_old_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_old_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_old_role = 'owner' THEN
        RAISE EXCEPTION 'Owner role cannot be changed from the application' USING ERRCODE = '42501';
    END IF;

    UPDATE public.profiles
    SET
        role = p_new_role,
        updated_at = NOW()
    WHERE id = p_user_id;

    PERFORM public.create_audit_log(
        'user.role.updated',
        'user',
        p_user_id,
        jsonb_build_object('role', v_old_role),
        jsonb_build_object('role', p_new_role, 'reason', p_reason, 'owner_id', v_owner_id),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.update_user_role IS 'Updates a user role with audit logging. Only owner can grant/revoke roles; owner role is migration-controlled.';

-- Admin/owner can still suspend and reactivate users.
CREATE OR REPLACE FUNCTION public.update_user_status(
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

    IF NOT public.is_admin(v_admin_id) THEN
        RAISE EXCEPTION 'Only admins can update user status' USING ERRCODE = '42501';
    END IF;

    SELECT status INTO v_old_status
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    UPDATE public.profiles
    SET
        status = p_new_status,
        updated_at = NOW(),
        suspended_at = CASE WHEN p_new_status = 'suspended' THEN NOW() ELSE suspended_at END,
        suspended_reason = CASE WHEN p_new_status = 'suspended' THEN p_reason ELSE suspended_reason END,
        suspended_by = CASE WHEN p_new_status = 'suspended' THEN v_admin_id ELSE suspended_by END
    WHERE id = p_user_id;

    PERFORM public.create_audit_log(
        'user.status.updated',
        'user',
        p_user_id,
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', p_new_status, 'reason', p_reason, 'suspended_by', v_admin_id),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.update_user_status IS 'Updates a user status with audit logging. Requires admin or owner privileges.';

-- ============================================
-- RECREATE DASHBOARD RPC CHECKS TO USE public.is_admin()
-- ============================================

CREATE OR REPLACE FUNCTION public.get_admin_stats_v2()
RETURNS JSONB AS $$
DECLARE
    v_total_users BIGINT;
    v_active_users_7d BIGINT;
    v_total_storage BIGINT;
    v_total_sync_ops BIGINT;
    v_successful_syncs BIGINT;
    v_failed_syncs BIGINT;
    v_suspended_users BIGINT;
    v_recent_audit_logs BIGINT;
    v_result JSONB;
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view dashboard stats' USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_active_users_7d FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '7 days';
    SELECT COALESCE(SUM(octet_length(ciphertext)), 0) INTO v_total_storage FROM public.encrypted_blobs;
    SELECT COUNT(*) INTO v_total_sync_ops FROM public.sync_metadata;
    SELECT COUNT(*) INTO v_successful_syncs FROM public.sync_metadata WHERE sync_status = 'idle' AND last_synced_at > NOW() - INTERVAL '24 hours';
    SELECT COUNT(*) INTO v_failed_syncs FROM public.sync_metadata WHERE sync_status IN ('error', 'conflict');
    SELECT COUNT(*) INTO v_suspended_users FROM public.profiles WHERE status = 'suspended';
    SELECT COUNT(*) INTO v_recent_audit_logs FROM public.audit_logs WHERE created_at > NOW() - INTERVAL '24 hours';

    v_result := jsonb_build_object(
        'total_users', v_total_users,
        'active_users_7d', v_active_users_7d,
        'total_storage_bytes', v_total_storage,
        'total_storage_mb', ROUND(v_total_storage::numeric / 1024 / 1024, 2),
        'total_sync_operations', v_total_sync_ops,
        'successful_syncs_24h', v_successful_syncs,
        'failed_syncs', v_failed_syncs,
        'sync_success_rate', CASE WHEN (v_successful_syncs + v_failed_syncs) > 0 THEN ROUND((v_successful_syncs::numeric / (v_successful_syncs + v_failed_syncs)) * 100, 1) ELSE 100 END,
        'suspended_users', v_suspended_users,
        'recent_audit_logs_24h', v_recent_audit_logs,
        'active_user_percentage', CASE WHEN v_total_users > 0 THEN ROUND((v_active_users_7d::numeric / v_total_users) * 100, 1) ELSE 0 END
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_activity_metrics()
RETURNS JSONB AS $$
DECLARE
    v_dau BIGINT;
    v_wau BIGINT;
    v_mau BIGINT;
    v_result JSONB;
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view activity metrics' USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(DISTINCT user_id) INTO v_dau FROM public.sync_metadata WHERE last_synced_at > NOW() - INTERVAL '1 day';
    SELECT COUNT(DISTINCT user_id) INTO v_wau FROM public.sync_metadata WHERE last_synced_at > NOW() - INTERVAL '7 days';
    SELECT COUNT(DISTINCT user_id) INTO v_mau FROM public.sync_metadata WHERE last_synced_at > NOW() - INTERVAL '30 days';

    v_result := jsonb_build_object(
        'dau', v_dau,
        'wau', v_wau,
        'mau', v_mau,
        'dau_wau_ratio', CASE WHEN v_wau > 0 THEN ROUND((v_dau::numeric / v_wau) * 100, 1) ELSE 0 END,
        'wau_mau_ratio', CASE WHEN v_mau > 0 THEN ROUND((v_wau::numeric / v_mau) * 100, 1) ELSE 0 END
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_growth(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    new_users BIGINT,
    total_users BIGINT
) AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view user growth' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(CURRENT_DATE - (p_days - 1) * INTERVAL '1 day', CURRENT_DATE, INTERVAL '1 day')::DATE AS date
    ),
    daily_signups AS (
        SELECT DATE(created_at) AS signup_date, COUNT(*) AS new_users
        FROM public.profiles
        WHERE created_at >= CURRENT_DATE - (p_days - 1) * INTERVAL '1 day'
        GROUP BY DATE(created_at)
    )
    SELECT
        ds.date,
        COALESCE(d.new_users, 0) AS new_users,
        (SELECT COUNT(*) FROM public.profiles WHERE DATE(created_at) <= ds.date) AS total_users
    FROM date_series ds
    LEFT JOIN daily_signups d ON ds.date = d.signup_date
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_storage_analytics()
RETURNS JSONB AS $$
DECLARE
    v_total_bytes BIGINT;
    v_avg_per_user NUMERIC;
    v_top_users JSONB;
    v_result JSONB;
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view storage analytics' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(SUM(octet_length(ciphertext)), 0) INTO v_total_bytes FROM public.encrypted_blobs;
    SELECT CASE WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(AVG(user_bytes), 2) ELSE 0 END INTO v_avg_per_user
    FROM (
        SELECT user_id, SUM(octet_length(ciphertext)) AS user_bytes
        FROM public.encrypted_blobs
        GROUP BY user_id
    ) user_storage;

    SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'bytes', total_bytes, 'mb', ROUND(total_bytes::numeric / 1024 / 1024, 2)) ORDER BY total_bytes DESC)
    INTO v_top_users
    FROM (
        SELECT user_id, SUM(octet_length(ciphertext)) AS total_bytes
        FROM public.encrypted_blobs
        GROUP BY user_id
        ORDER BY total_bytes DESC
        LIMIT 5
    ) top_users;

    v_result := jsonb_build_object(
        'total_bytes', v_total_bytes,
        'total_mb', ROUND(v_total_bytes::numeric / 1024 / 1024, 2),
        'total_gb', ROUND(v_total_bytes::numeric / 1024 / 1024 / 1024, 2),
        'avg_per_user_bytes', v_avg_per_user,
        'avg_per_user_mb', ROUND(v_avg_per_user / 1024 / 1024, 2),
        'top_consumers', COALESCE(v_top_users, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_recent_audit_logs(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    actor_id UUID,
    actor_email VARCHAR,
    action VARCHAR,
    resource_type VARCHAR,
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    severity audit_severity,
    status audit_status,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view audit logs' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT al.id, al.actor_id, al.actor_email, al.action, al.resource_type, al.resource_id, al.old_value, al.new_value, al.severity, al.status, al.created_at
    FROM public.audit_logs al
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_admin_stats_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activity_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_growth TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_audit_logs TO authenticated;


COMMENT ON COLUMN public.profiles.role IS 'User role: user, moderator, admin, or owner. Owner is the single root account; admins can manage operations but cannot grant admin access.';
COMMENT ON FUNCTION public.is_owner(UUID) IS 'Checks whether a user has the root owner role.';
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Checks whether a user has admin-equivalent access. Owner is treated as admin for dashboard access.';

-- Patch user activity/session RPCs from 016 to use public.is_admin(), so owner works everywhere.
CREATE OR REPLACE FUNCTION public.get_user_activity_details(p_user_id UUID)
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
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view user activity details' USING ERRCODE = '42501';
    END IF;

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
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_user_profile IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    SELECT jsonb_build_object(
        'email', email,
        'email_confirmed_at', email_confirmed_at,
        'last_sign_in_at', last_sign_in_at,
        'created_at', created_at,
        'confirmed_at', confirmed_at
    ) INTO v_auth_info
    FROM auth.users
    WHERE id = p_user_id;

    SELECT jsonb_build_object(
        'total_blobs', COUNT(*),
        'total_bytes', COALESCE(SUM(octet_length(ciphertext)), 0),
        'total_mb', ROUND(COALESCE(SUM(octet_length(ciphertext)), 0)::numeric / 1024 / 1024, 2),
        'oldest_blob', MIN(created_at),
        'newest_blob', MAX(created_at)
    ) INTO v_storage_stats
    FROM public.encrypted_blobs
    WHERE user_id = p_user_id;

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
        FROM public.sync_metadata
        WHERE user_id = p_user_id
        ORDER BY last_synced_at DESC
        LIMIT 20
    ) recent_syncs;

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
        FROM public.audit_logs
        WHERE resource_id = p_user_id
           OR (new_value->>'user_id')::uuid = p_user_id
        ORDER BY created_at DESC
        LIMIT 50
    ) user_logs;

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
        FROM public.devices d
        LEFT JOIN public.sync_metadata sm ON d.id = sm.device_id AND sm.user_id = p_user_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id UUID)
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
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view user sessions' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.ip_address,
        s.user_agent,
        s.device_info,
        s.created_at,
        s.last_active_at,
        s.expires_at,
        (s.session_token = current_setting('request.headers', true)::json->>'x-session-token') AS is_current_session
    FROM public.admin_sessions s
    WHERE s.user_id = p_user_id
      AND s.is_revoked = FALSE
      AND s.expires_at > NOW()
    ORDER BY s.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.revoke_user_session(
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

    IF NOT public.is_admin(v_admin_id) THEN
        RAISE EXCEPTION 'Only admins can revoke sessions' USING ERRCODE = '42501';
    END IF;

    SELECT user_id INTO v_user_id
    FROM public.admin_sessions
    WHERE id = p_session_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    UPDATE public.admin_sessions
    SET
        is_revoked = TRUE,
        revoked_at = NOW(),
        revoked_by = v_admin_id
    WHERE id = p_session_id;

    PERFORM public.create_audit_log(
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(
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

    IF NOT public.is_admin(v_admin_id) THEN
        RAISE EXCEPTION 'Only admins can revoke sessions' USING ERRCODE = '42501';
    END IF;

    UPDATE public.admin_sessions
    SET
        is_revoked = TRUE,
        revoked_at = NOW(),
        revoked_by = v_admin_id
    WHERE user_id = p_user_id
      AND is_revoked = FALSE;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    PERFORM public.create_audit_log(
        'user.sessions.revoked_all',
        'user',
        p_user_id,
        NULL,
        jsonb_build_object('revoked_count', v_revoked_count, 'reason', p_reason, 'admin_id', v_admin_id),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_activity_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_session(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_user_sessions(UUID, TEXT) TO authenticated;
