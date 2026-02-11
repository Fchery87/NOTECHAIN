-- Fix profiles table to be more permissive for OAuth users

-- Check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Make encrypted_profile nullable (in case that's causing issues)
ALTER TABLE public.profiles 
ALTER COLUMN encrypted_profile DROP NOT NULL;

-- Add default value
ALTER TABLE public.profiles 
ALTER COLUMN encrypted_profile SET DEFAULT '\x00';

-- Make email_hash nullable too
ALTER TABLE public.profiles 
ALTER COLUMN email_hash DROP NOT NULL;

-- Add default for email_hash
ALTER TABLE public.profiles 
ALTER COLUMN email_hash SET DEFAULT '';

-- Verify changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles';
