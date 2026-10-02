-- Migration: 021_harden_signup_profile_creation.sql
-- Makes profile creation at signup correct and repairs rows written by earlier
-- hand-applied fixes. Safe to run more than once.
--
-- Problems this fixes:
-- 1. A user with no email (some OAuth providers) made the signup trigger hash
--    NULL, which violated email_hash NOT NULL and blocked signup.
-- 2. Migration 012, and the hand-applied fix_auth_trigger_simple.sql, wrote the
--    raw email into email_hash. The column is documented as a SHA-256 hash.
-- 3. A trigger that swallowed errors could leave auth users without a profile.
--
-- Existing environments run this as a normal migration: the baseline (001) is a
-- no-op there, so changes to signup behavior have to land here.

-- 1. Signup trigger function ---------------------------------------------------
-- Falls back to the user id when there is no email so the hash stays unique.
-- Errors are not swallowed: a failed profile insert should fail signup loudly
-- instead of leaving a user whose sync can never work.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email_hash, encrypted_profile)
    VALUES (
        NEW.id,
        encode(extensions.digest(COALESCE(NEW.email, NEW.id::text), 'sha256'), 'hex'),
        '\x00'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = extensions, public, pg_temp;

-- 2. Make sure the trigger exists and points at the function above -------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- digest() is schema-qualified because the migration session's search_path does not
-- include the extensions schema on hosted Supabase.
-- 3. Repair existing data ------------------------------------------------------
-- Auth users that never got a profile.
INSERT INTO public.profiles (id, email_hash, encrypted_profile)
SELECT u.id,
       encode(extensions.digest(COALESCE(u.email, u.id::text), 'sha256'), 'hex'),
       '\x00'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Anything in email_hash that is not a SHA-256 hex digest (a raw email, an empty
-- string, NULL) is recomputed from the authoritative auth user.
UPDATE public.profiles p
SET email_hash = encode(extensions.digest(COALESCE(u.email, u.id::text), 'sha256'), 'hex')
FROM auth.users u
WHERE u.id = p.id
  AND (p.email_hash IS NULL OR p.email_hash !~ '^[0-9a-f]{64}$');

-- 4. Keep plaintext out for good -----------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'profiles_email_hash_is_sha256'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_email_hash_is_sha256
            CHECK (email_hash ~ '^[0-9a-f]{64}$');
    END IF;
END
$$;
