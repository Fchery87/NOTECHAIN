-- Migration: 008_enhance_profiles_admin.sql
-- Enhances profiles table with admin dashboard fields
-- Date: 2026-02-15

-- Create plan enum type
DO $$ BEGIN
    CREATE TYPE user_plan AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create status enum type
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to profiles table
ALTER TABLE profiles
    -- User management
    ADD COLUMN IF NOT EXISTS plan user_plan DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
    ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),

    -- Tracking
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,

    -- Metadata (extensible for future features)
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies for profile access
-- Admins can view all profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles"
            ON profiles
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END
$$;

-- Admins can update all profiles (for user management)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all profiles' AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles"
            ON profiles
            FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END
$$;

-- Add comments for documentation
COMMENT ON COLUMN profiles.plan IS 'User subscription plan: free, pro, or enterprise';
COMMENT ON COLUMN profiles.status IS 'User account status: active, suspended, or inactive';
COMMENT ON COLUMN profiles.suspended_at IS 'Timestamp when user was suspended';
COMMENT ON COLUMN profiles.suspended_reason IS 'Reason for suspension (admin note)';
COMMENT ON COLUMN profiles.suspended_by IS 'Admin user who performed the suspension';
COMMENT ON COLUMN profiles.last_active_at IS 'Last time user was active (last_sign_in_at from auth.users)';
COMMENT ON COLUMN profiles.metadata IS 'Extensible JSON metadata for future features';
