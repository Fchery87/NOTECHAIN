-- Simple fix for auth trigger - avoids potential issues with digest function
-- Run this in Supabase SQL Editor

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create simplified trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple insert with minimal requirements
    INSERT INTO public.profiles (id, email_hash, encrypted_profile)
    VALUES (
        NEW.id,
        NEW.email,  -- Use email directly instead of hash for now
        '\x00'
    )
    ON CONFLICT (id) DO NOTHING;  -- Don't fail if already exists
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't let profile creation break auth
    RAISE LOG 'Profile creation failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test the trigger (optional)
-- This will show if the trigger works
SELECT 
    'Trigger recreated successfully' as status,
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
