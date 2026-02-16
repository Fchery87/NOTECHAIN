-- Verification Script for Admin Dashboard Access
-- Run this in Supabase SQL Editor to verify the setup is correct

-- 1. Check if role column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name = 'role';

-- 2. Check all RLS policies on profiles table
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- 3. Check if is_admin function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin';

-- 4. List all users with their roles
SELECT id, role, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 5. Test if current user can read their own role
-- (Run this while logged in to verify RLS works)
SELECT id, role FROM profiles WHERE id = auth.uid();

-- 6. Check if the user_role enum type exists
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'user_role';
