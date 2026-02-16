-- Migration: 014_fix_rls_allow_self_role_read.sql
-- Emergency fix: Ensure users can ALWAYS read their own role
-- Date: 2026-02-16
--
-- This fixes an issue where RLS policies were blocking users from reading
-- their own role, causing the admin dashboard link to not appear.

-- ============================================
-- STEP 1: Check and drop ALL existing policies on profiles
-- ============================================

-- Drop all existing policies to start fresh
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Create minimal, correct policies
-- ============================================

-- Policy 1: Users can ALWAYS view their own profile (including role)
-- This is the critical policy that was missing/broken
CREATE POLICY "users_view_own_profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy 2: Users can insert their own profile (for signup)
CREATE POLICY "users_insert_own_profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile (non-role fields)
CREATE POLICY "users_update_own_profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can view all profiles
-- Uses SECURITY DEFINER function to avoid circular dependency
CREATE POLICY "admins_view_all_profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Policy 5: Admins can update all profiles (for user management)
CREATE POLICY "admins_update_all_profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- STEP 3: Ensure is_admin function exists and is correct
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the user has admin role
    -- Use SECURITY DEFINER to bypass RLS for this check
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ============================================
-- STEP 4: Verify the setup
-- ============================================

-- Log the policies created
DO $$
DECLARE
    pol_count integer;
BEGIN
    SELECT COUNT(*) INTO pol_count 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    RAISE NOTICE 'Created % policies on profiles table', pol_count;
END $$;
