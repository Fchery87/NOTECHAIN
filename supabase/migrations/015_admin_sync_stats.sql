-- Migration: 015_admin_sync_stats.sql
-- Adds sync statistics support for admin dashboard
-- Date: 2026-02-15

-- ============================================
-- ENHANCED ADMIN STATS WITH SYNC METRICS
-- ============================================

-- Function: Get admin dashboard overview stats with sync metrics
-- Usage: SELECT * FROM get_admin_stats_v2();
CREATE OR REPLACE FUNCTION get_admin_stats_v2()
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
    
    -- Total sync operations (count from sync_metadata entries)
    SELECT COUNT(*) INTO v_total_sync_ops FROM sync_metadata;
    
    -- Successful syncs (status = 'idle' and recently synced)
    SELECT COUNT(*) INTO v_successful_syncs 
    FROM sync_metadata 
    WHERE sync_status = 'idle' 
    AND last_synced_at > NOW() - INTERVAL '24 hours';
    
    -- Failed syncs
    SELECT COUNT(*) INTO v_failed_syncs 
    FROM sync_metadata 
    WHERE sync_status IN ('error', 'conflict');
    
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
        'successful_syncs_24h', v_successful_syncs,
        'failed_syncs', v_failed_syncs,
        'sync_success_rate', CASE 
            WHEN (v_successful_syncs + v_failed_syncs) > 0 
            THEN ROUND((v_successful_syncs::numeric / (v_successful_syncs + v_failed_syncs)) * 100, 1)
            ELSE 100
        END,
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

COMMENT ON FUNCTION get_admin_stats_v2 IS 'Returns admin dashboard overview statistics including sync metrics. Requires admin privileges.';

-- ============================================
-- ANALYTICS FUNCTIONS FOR PHASE 2
-- ============================================

-- Function: Get DAU/WAU/MAU metrics
-- Usage: SELECT * FROM get_user_activity_metrics();
CREATE OR REPLACE FUNCTION get_user_activity_metrics()
RETURNS JSONB AS $$
DECLARE
    v_dau BIGINT;
    v_wau BIGINT;
    v_mau BIGINT;
    v_result JSONB;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view activity metrics';
    END IF;
    
    -- DAU (Daily Active Users) - users who synced in last 24h
    SELECT COUNT(DISTINCT user_id) INTO v_dau
    FROM sync_metadata
    WHERE last_synced_at > NOW() - INTERVAL '1 day';
    
    -- WAU (Weekly Active Users) - users who synced in last 7 days
    SELECT COUNT(DISTINCT user_id) INTO v_wau
    FROM sync_metadata
    WHERE last_synced_at > NOW() - INTERVAL '7 days';
    
    -- MAU (Monthly Active Users) - users who synced in last 30 days
    SELECT COUNT(DISTINCT user_id) INTO v_mau
    FROM sync_metadata
    WHERE last_synced_at > NOW() - INTERVAL '30 days';
    
    v_result := jsonb_build_object(
        'dau', v_dau,
        'wau', v_wau,
        'mau', v_mau,
        'dau_wau_ratio', CASE WHEN v_wau > 0 THEN ROUND((v_dau::numeric / v_wau) * 100, 1) ELSE 0 END,
        'wau_mau_ratio', CASE WHEN v_mau > 0 THEN ROUND((v_wau::numeric / v_mau) * 100, 1) ELSE 0 END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_activity_metrics IS 'Returns DAU/WAU/MAU metrics. Requires admin privileges.';

-- Function: Get user growth over time
-- Usage: SELECT * FROM get_user_growth(30); -- last 30 days
CREATE OR REPLACE FUNCTION get_user_growth(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    new_users BIGINT,
    total_users BIGINT
) AS $$
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view user growth';
    END IF;
    
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE AS date
    ),
    daily_signups AS (
        SELECT 
            DATE(created_at) AS signup_date,
            COUNT(*) AS new_users
        FROM profiles
        WHERE created_at >= CURRENT_DATE - (p_days - 1) * INTERVAL '1 day'
        GROUP BY DATE(created_at)
    )
    SELECT 
        ds.date,
        COALESCE(d.new_users, 0) AS new_users,
        (SELECT COUNT(*) FROM profiles WHERE DATE(created_at) <= ds.date) AS total_users
    FROM date_series ds
    LEFT JOIN daily_signups d ON ds.date = d.signup_date
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_growth IS 'Returns daily user growth statistics. Requires admin privileges.';

-- Function: Get storage analytics
-- Usage: SELECT * FROM get_storage_analytics();
CREATE OR REPLACE FUNCTION get_storage_analytics()
RETURNS JSONB AS $$
DECLARE
    v_total_bytes BIGINT;
    v_avg_per_user NUMERIC;
    v_top_users JSONB;
    v_result JSONB;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view storage analytics';
    END IF;
    
    -- Total storage
    SELECT COALESCE(SUM(octet_length(ciphertext)), 0) INTO v_total_bytes
    FROM encrypted_blobs;
    
    -- Average per user
    SELECT 
        CASE 
            WHEN COUNT(DISTINCT user_id) > 0 
            THEN ROUND(AVG(user_bytes), 2)
            ELSE 0 
        END INTO v_avg_per_user
    FROM (
        SELECT user_id, SUM(octet_length(ciphertext)) AS user_bytes
        FROM encrypted_blobs
        GROUP BY user_id
    ) user_storage;
    
    -- Top 5 storage consumers
    SELECT jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'bytes', total_bytes,
        'mb', ROUND(total_bytes::numeric / 1024 / 1024, 2)
    ) ORDER BY total_bytes DESC)
    INTO v_top_users
    FROM (
        SELECT 
            user_id, 
            SUM(octet_length(ciphertext)) AS total_bytes
        FROM encrypted_blobs
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_storage_analytics IS 'Returns storage analytics including top consumers. Requires admin privileges.';

-- Function: Get recent audit logs for dashboard
-- Usage: SELECT * FROM get_recent_audit_logs(10);
CREATE OR REPLACE FUNCTION get_recent_audit_logs(p_limit INTEGER DEFAULT 50)
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
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view audit logs';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id,
        al.actor_id,
        al.actor_email,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_value,
        al.new_value,
        al.severity,
        al.status,
        al.created_at
    FROM audit_logs al
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_recent_audit_logs IS 'Returns recent audit logs. Requires admin privileges.';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_admin_stats_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_growth TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_audit_logs TO authenticated;
