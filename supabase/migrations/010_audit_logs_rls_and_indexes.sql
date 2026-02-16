-- Migration: 010_audit_logs_rls_and_indexes.sql
-- RLS policies and performance indexes for audit_logs table
-- Date: 2026-02-15

-- ============================================
-- RLS POLICIES FOR AUDIT_LOGS
-- ============================================

-- Policy: Only admins can read audit logs
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all audit logs' AND tablename = 'audit_logs'
    ) THEN
        CREATE POLICY "Admins can read all audit logs"
            ON audit_logs
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Policy: System/authenticated can insert audit logs (for logging actions)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can insert audit logs' AND tablename = 'audit_logs'
    ) THEN
        CREATE POLICY "Authenticated can insert audit logs"
            ON audit_logs
            FOR INSERT
            TO authenticated
            WITH CHECK (actor_id = auth.uid());
    END IF;
END $$;

-- Policy: No one can update audit logs (append-only)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'No updates allowed on audit logs' AND tablename = 'audit_logs'
    ) THEN
        CREATE POLICY "No updates allowed on audit logs"
            ON audit_logs
            FOR UPDATE
            TO authenticated
            USING (false)
            WITH CHECK (false);
    END IF;
END $$;

-- Policy: No one can delete audit logs (compliance requirement)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'No deletes allowed on audit logs' AND tablename = 'audit_logs'
    ) THEN
        CREATE POLICY "No deletes allowed on audit logs"
            ON audit_logs
            FOR DELETE
            TO authenticated
            USING (false);
    END IF;
END $$;

-- ============================================
-- INDEXES FOR PROFILES TABLE
-- ============================================

-- Status filter index
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Plan filter index
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- Last active sort/filter index
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC);

-- Composite index for admin queries (role + status)
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles(role, status);

-- ============================================
-- INDEXES FOR AUDIT_LOGS TABLE
-- ============================================

-- Actor lookup index
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);

-- Action type filter index
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Resource lookup index (type + id)
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Date sort index (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Severity filter index (only warning and critical for alerts)
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('warning', 'critical');

-- Composite index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant read access to authenticated users (RLS will filter to admins)
GRANT SELECT ON audit_logs TO authenticated;

-- Grant insert access for logging
GRANT INSERT ON audit_logs TO authenticated;
