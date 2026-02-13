-- Migration: 005_supplemental_schema.sql
-- Handles case where tables already exist from previous setup

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_hash VARCHAR(255) UNIQUE NOT NULL,
    encrypted_profile BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END
$$;

-- Create encrypted_blobs table if not exists
CREATE TABLE IF NOT EXISTS public.encrypted_blobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blob_type VARCHAR(50) NOT NULL,
    ciphertext BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    auth_tag BYTEA NOT NULL,
    key_id UUID NOT NULL,
    metadata_hash BYTEA NOT NULL,
    version BIGINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    operation_type VARCHAR(20) DEFAULT 'create',
    session_id UUID,
    blob_uuid UUID DEFAULT uuid_generate_v4()
);

ALTER TABLE public.encrypted_blobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own encrypted blobs' AND tablename = 'encrypted_blobs'
    ) THEN
        CREATE POLICY "Users can view own encrypted blobs" ON public.encrypted_blobs FOR SELECT USING (
            user_id = auth.uid()
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own encrypted blobs' AND tablename = 'encrypted_blobs'
    ) THEN
        CREATE POLICY "Users can insert own encrypted blobs" ON public.encrypted_blobs FOR INSERT WITH CHECK (
            user_id = auth.uid()
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own encrypted blobs' AND tablename = 'encrypted_blobs'
    ) THEN
        CREATE POLICY "Users can update own encrypted blobs" ON public.encrypted_blobs FOR UPDATE USING (
            user_id = auth.uid()
        );
    END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blobs_user_id ON public.encrypted_blobs(user_id);
CREATE INDEX IF NOT EXISTS idx_blobs_type_version ON public.encrypted_blobs(user_id, blob_type, version);
CREATE INDEX IF NOT EXISTS idx_blobs_deleted ON public.encrypted_blobs(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_blobs_session ON public.encrypted_blobs(session_id);

-- Create sync_operations view
CREATE OR REPLACE VIEW public.sync_operations AS
SELECT 
    id,
    user_id,
    blob_uuid as entity_id,
    blob_type as entity_type,
    operation_type,
    version,
    session_id,
    encode(ciphertext, 'base64') || ':' || encode(nonce, 'base64') || ':' || encode(auth_tag, 'base64') as encrypted_payload,
    created_at as timestamp,
    is_deleted
FROM public.encrypted_blobs;

-- Create insert_sync_operation function
CREATE OR REPLACE FUNCTION public.insert_sync_operation(
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
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.encrypted_blobs (
        user_id,
        blob_uuid,
        blob_type,
        operation_type,
        version,
        session_id,
        ciphertext,
        nonce,
        auth_tag,
        key_id,
        metadata_hash
    ) VALUES (
        p_user_id,
        p_entity_id,
        p_entity_type,
        p_operation_type,
        p_version,
        p_session_id,
        p_ciphertext,
        p_nonce,
        p_auth_tag,
        p_key_id,
        p_metadata_hash
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;
    
    IF v_id IS NULL THEN
        UPDATE public.encrypted_blobs SET
            operation_type = p_operation_type,
            version = p_version,
            session_id = p_session_id,
            ciphertext = p_ciphertext,
            nonce = p_nonce,
            auth_tag = p_auth_tag,
            key_id = p_key_id,
            metadata_hash = p_metadata_hash,
            updated_at = NOW()
        WHERE user_id = p_user_id AND blob_uuid = p_entity_id
        RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.insert_sync_operation TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_sync_operation TO anon;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.encrypted_blobs TO authenticated;
