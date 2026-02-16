-- Migration: 009_create_audit_logs.sql
-- Creates comprehensive audit logging table for admin dashboard
-- Date: 2026-02-15

-- Enable uuid-ossp extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Create severity enum
DO $$ BEGIN
    CREATE TYPE audit_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create status enum
DO $$ BEGIN
    CREATE TYPE audit_status AS ENUM ('success', 'failure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the comprehensive audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

    -- Who did it
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255), -- Denormalized for forensics

    -- What happened
    action VARCHAR(100) NOT NULL, -- 'user.role.updated', 'user.suspended', etc.
    resource_type VARCHAR(50), -- 'user', 'setting', 'profile'
    resource_id UUID,

    -- Change tracking (compliance)
    old_value JSONB,
    new_value JSONB,

    -- Context (security)
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100), -- Distributed tracing

    -- Bulk operations
    affected_count INTEGER DEFAULT 1,

    -- Performance
    duration_ms INTEGER,

    -- Metadata
    severity audit_severity DEFAULT 'info',
    status audit_status DEFAULT 'success',
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all administrative actions';
COMMENT ON COLUMN audit_logs.actor_id IS 'User who performed the action';
COMMENT ON COLUMN audit_logs.actor_email IS 'Denormalized email for forensic analysis';
COMMENT ON COLUMN audit_logs.action IS 'Action type: user.role.updated, user.suspended, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected: user, setting, profile';
COMMENT ON COLUMN audit_logs.resource_id IS 'UUID of the affected resource';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous value before change (JSON)';
COMMENT ON COLUMN audit_logs.new_value IS 'New value after change (JSON)';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the actor';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string';
COMMENT ON COLUMN audit_logs.request_id IS 'Request ID for distributed tracing';
COMMENT ON COLUMN audit_logs.affected_count IS 'Number of resources affected (for bulk operations)';
COMMENT ON COLUMN audit_logs.duration_ms IS 'Operation duration in milliseconds';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: info, warning, critical';
COMMENT ON COLUMN audit_logs.status IS 'Operation status: success or failure';
COMMENT ON COLUMN audit_logs.error_message IS 'Error message if status is failure';
