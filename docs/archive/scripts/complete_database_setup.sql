-- Complete NoteChain Database Setup
-- Run this entire file in Supabase SQL Editor

-- ============================================
-- Step 1: Enable required extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Step 2: Create profiles table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_hash VARCHAR(255) UNIQUE NOT NULL,
    encrypted_profile BYTEA NOT NULL DEFAULT '\x00',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Index for email_hash
CREATE INDEX IF NOT EXISTS idx_profiles_email_hash ON public.profiles(email_hash);

-- ============================================
-- Step 3: Create encrypted_blobs table
-- ============================================
CREATE TABLE IF NOT EXISTS public.encrypted_blobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blob_type VARCHAR(50) NOT NULL,
    blob_uuid UUID DEFAULT uuid_generate_v4(),
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

-- Enable RLS on encrypted_blobs
ALTER TABLE public.encrypted_blobs ENABLE ROW LEVEL SECURITY;

-- Encrypted Blobs RLS Policies
DROP POLICY IF EXISTS "Users can view own encrypted blobs" ON public.encrypted_blobs;
CREATE POLICY "Users can view own encrypted blobs"
ON public.encrypted_blobs FOR SELECT 
USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own encrypted blobs" ON public.encrypted_blobs;
CREATE POLICY "Users can insert own encrypted blobs"
ON public.encrypted_blobs FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own encrypted blobs" ON public.encrypted_blobs;
CREATE POLICY "Users can update own encrypted blobs"
ON public.encrypted_blobs FOR UPDATE 
USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Indexes for encrypted_blobs
CREATE INDEX IF NOT EXISTS idx_blobs_user_id ON public.encrypted_blobs(user_id);
CREATE INDEX IF NOT EXISTS idx_blobs_session ON public.encrypted_blobs(session_id);
CREATE INDEX IF NOT EXISTS idx_blobs_version ON public.encrypted_blobs(user_id, version);

-- ============================================
-- Step 4: Create sync operations view
-- ============================================
DROP VIEW IF EXISTS public.sync_operations;
CREATE VIEW public.sync_operations AS
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

-- ============================================
-- Step 5: Create insert_sync_operation function
-- ============================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_sync_operation TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_sync_operation TO anon;

-- ============================================
-- Step 6: Create triggers for profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email_hash, encrypted_profile)
    VALUES (
        NEW.id,
        encode(digest(NEW.email, 'sha256'), 'hex'),
        '\x00'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Step 7: Create sync_metadata table
-- ============================================
CREATE TABLE IF NOT EXISTS public.sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    device_id UUID,
    last_sync_version BIGINT DEFAULT 0,
    sync_status VARCHAR(50) DEFAULT 'idle',
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, device_id)
);

ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync metadata" ON public.sync_metadata;
CREATE POLICY "Users can view own sync metadata"
ON public.sync_metadata FOR SELECT 
USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own sync metadata" ON public.sync_metadata;
CREATE POLICY "Users can insert own sync metadata"
ON public.sync_metadata FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own sync metadata" ON public.sync_metadata;
CREATE POLICY "Users can update own sync metadata"
ON public.sync_metadata FOR UPDATE 
USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));
