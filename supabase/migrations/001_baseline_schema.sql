-- Migration: 001_baseline_schema.sql
-- Baseline for a fresh database.
--
-- Migrations 005 onward assume the schema produced by the hand-applied
-- complete_database_setup.sql already exists (profiles, encrypted_blobs, the
-- sync_operations view, insert_sync_operation, the signup trigger) plus the
-- profiles.role column. Nothing in supabase/migrations created them, so a fresh
-- `supabase db reset` failed at 008.
--
-- This file reproduces that starting state. It is safe on existing databases:
-- every group is created only when its anchor object is absent, so on a database
-- that already has these objects it changes nothing. In particular it never
-- replaces insert_sync_operation, which migrations 017 and 020 hardened.
--
-- Existing environments: mark it applied instead of running it:
--   supabase migration repair --status applied 001

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- profiles ------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email_hash VARCHAR(255) UNIQUE NOT NULL,
            encrypted_profile BYTEA NOT NULL DEFAULT '\x00',
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );

        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own profile"
            ON public.profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can insert own profile"
            ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
        CREATE POLICY "Users can update own profile"
            ON public.profiles FOR UPDATE USING (auth.uid() = id);

        CREATE INDEX idx_profiles_email_hash ON public.profiles(email_hash);
    END IF;
END
$$;

-- profiles.role: 008 writes a policy that reads it, and 013 only adds it later.
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'user';

-- encrypted_blobs -----------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.encrypted_blobs') IS NULL THEN
        CREATE TABLE public.encrypted_blobs (
            id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
            blob_type VARCHAR(50) NOT NULL,
            blob_uuid UUID DEFAULT extensions.uuid_generate_v4(),
            ciphertext BYTEA NOT NULL,
            nonce BYTEA NOT NULL,
            auth_tag BYTEA NOT NULL,
            key_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            metadata_hash BYTEA NOT NULL DEFAULT '\x00',
            version BIGINT DEFAULT 1,
            operation_type VARCHAR(20) DEFAULT 'create',
            session_id UUID,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            UNIQUE(user_id, blob_uuid)
        );

        ALTER TABLE public.encrypted_blobs ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own encrypted blobs"
            ON public.encrypted_blobs FOR SELECT
            USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));
        CREATE POLICY "Users can insert own encrypted blobs"
            ON public.encrypted_blobs FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));
        CREATE POLICY "Users can update own encrypted blobs"
            ON public.encrypted_blobs FOR UPDATE
            USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

        CREATE INDEX idx_blobs_user_id ON public.encrypted_blobs(user_id);
        CREATE INDEX idx_blobs_session ON public.encrypted_blobs(session_id);
        CREATE INDEX idx_blobs_version ON public.encrypted_blobs(user_id, version);
    END IF;
END
$$;

-- sync_operations view ------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.sync_operations') IS NULL THEN
        CREATE VIEW public.sync_operations AS
        SELECT
            id,
            user_id,
            blob_uuid AS entity_id,
            blob_type AS entity_type,
            operation_type,
            version,
            session_id,
            encode(ciphertext, 'base64') || ':' || encode(nonce, 'base64') || ':' || encode(auth_tag, 'base64') AS encrypted_payload,
            created_at AS timestamp,
            is_deleted
        FROM public.encrypted_blobs;
    END IF;
END
$$;

-- insert_sync_operation: anchored on the name, not the signature, because 020
-- removed the original overload and it must not come back.
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'insert_sync_operation' AND pronamespace = 'public'::regnamespace
    ) THEN
        CREATE FUNCTION public.insert_sync_operation(
            p_user_id UUID,
            p_entity_id UUID,
            p_entity_type VARCHAR(50),
            p_operation_type VARCHAR(20),
            p_version BIGINT,
            p_session_id UUID,
            p_ciphertext BYTEA,
            p_nonce BYTEA,
            p_auth_tag BYTEA,
            p_key_id UUID,
            p_metadata_hash BYTEA
        )
        RETURNS UUID AS $fn$
        DECLARE
            v_id UUID;
        BEGIN
            INSERT INTO public.encrypted_blobs (
                user_id, blob_uuid, blob_type, operation_type, version, session_id,
                ciphertext, nonce, auth_tag, key_id, metadata_hash
            ) VALUES (
                p_user_id, p_entity_id, p_entity_type, p_operation_type, p_version, p_session_id,
                p_ciphertext, p_nonce, p_auth_tag, p_key_id, p_metadata_hash
            )
            ON CONFLICT (user_id, blob_uuid)
            DO UPDATE SET
                operation_type = EXCLUDED.operation_type,
                version = EXCLUDED.version,
                session_id = EXCLUDED.session_id,
                ciphertext = EXCLUDED.ciphertext,
                nonce = EXCLUDED.nonce,
                auth_tag = EXCLUDED.auth_tag,
                key_id = EXCLUDED.key_id,
                metadata_hash = EXCLUDED.metadata_hash,
                updated_at = NOW()
            RETURNING id INTO v_id;

            RETURN v_id;
        END;
        $fn$ LANGUAGE plpgsql SECURITY DEFINER;

        GRANT EXECUTE ON FUNCTION public.insert_sync_operation TO authenticated;
    END IF;
END
$do$;

-- updated_at trigger function and profiles trigger --------------------------
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace
    ) THEN
        CREATE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;

        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$do$;

-- signup trigger: creates the profile row for every new auth user ------------
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace
    ) THEN
        CREATE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $fn$
        BEGIN
            INSERT INTO public.profiles (id, email_hash, encrypted_profile)
            VALUES (
                NEW.id,
                encode(extensions.digest(NEW.email, 'sha256'), 'hex'),
                '\x00'
            );
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$do$;

-- sync_metadata -------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.sync_metadata') IS NULL THEN
        CREATE TABLE public.sync_metadata (
            id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
            device_id UUID,
            last_sync_version BIGINT DEFAULT 0,
            sync_status VARCHAR(50) DEFAULT 'idle',
            last_synced_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            UNIQUE(user_id, device_id)
        );

        ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own sync metadata"
            ON public.sync_metadata FOR SELECT
            USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));
        CREATE POLICY "Users can insert own sync metadata"
            ON public.sync_metadata FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));
        CREATE POLICY "Users can update own sync metadata"
            ON public.sync_metadata FOR UPDATE
            USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END
$$;
