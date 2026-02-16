-- Migration: 012_fix_missing_profiles.sql
-- Fixes missing profiles for existing auth users and sets up first admin
-- Date: 2026-02-15

-- Create profiles for users who don't have one
INSERT INTO profiles (
    id,
    email_hash,
    encrypted_profile,
    role,
    plan,
    status,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    '\x00',
    'user',
    'free',
    'active',
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Make the first user an admin (if no admin exists yet)
DO $$
DECLARE
    v_first_user_id UUID;
    v_admin_exists BOOLEAN;
BEGIN
    -- Check if any admin exists
    SELECT EXISTS(
        SELECT 1 FROM profiles WHERE role = 'admin'
    ) INTO v_admin_exists;
    
    -- If no admin exists, make the first user an admin
    IF NOT v_admin_exists THEN
        SELECT id INTO v_first_user_id
        FROM profiles
        ORDER BY created_at ASC
        LIMIT 1;
        
        IF v_first_user_id IS NOT NULL THEN
            UPDATE profiles 
            SET role = 'admin' 
            WHERE id = v_first_user_id;
            
            RAISE NOTICE 'Made user % an admin', v_first_user_id;
        END IF;
    END IF;
END
$$;
