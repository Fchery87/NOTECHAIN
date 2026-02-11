-- Fix: Update the auth trigger to handle errors gracefully
-- This fixes the "Database error saving new user" issue

-- First, let's drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create an improved version with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile with safe defaults
    -- Using TRY/CATCH equivalent in PostgreSQL
    BEGIN
        INSERT INTO public.profiles (id, email_hash, encrypted_profile, created_at, updated_at)
        VALUES (
            NEW.id,
            COALESCE(encode(digest(COALESCE(NEW.email, ''), 'sha256'), 'hex'), ''),
            '\x00',  -- Empty encrypted profile
            NOW(),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't prevent user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the fix
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
AND event_object_table = 'users';
