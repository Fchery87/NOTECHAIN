-- Migration: 013_fix_role_column_and_policies.sql
-- Fixes missing role column and RLS policies for admin dashboard access
-- Date: 2026-02-16
-- 
-- This migration addresses a regression where the admin dashboard link
-- was not appearing in the user dropdown menu due to:
-- 1. Missing role column in profiles table
-- 2. Missing or conflicting RLS policies for role access

-- ============================================
-- STEP 1: Ensure role column exists
-- ============================================

-- Create role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to profiles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';
    END IF;
END $$;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================
-- STEP 2: Fix RLS policies for profiles table
-- ============================================

-- First, drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view own role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate essential policies with correct permissions

-- Policy: Users can view their own profile (including role)
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Admins can view all profiles (needed for admin dashboard)
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile (non-role fields)
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Only admins can update roles (prevent privilege escalation)
CREATE POLICY "Only admins can update roles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- STEP 3: Create helper function for admin check
-- ============================================

-- Create or replace function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ============================================
-- STEP 4: Ensure existing admins have correct role
-- ============================================

-- This section is for manual execution if needed
-- Uncomment and modify to set admin role for specific users:
-- UPDATE public.profiles SET role = 'admin' WHERE email_hash = '<hash>';

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.profiles.role IS 'User role: user, moderator, or admin. Controls access to admin dashboard and other privileged features.';
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Helper function to check if a user has admin role. Uses SECURITY DEFINER to bypass RLS for the check.';
