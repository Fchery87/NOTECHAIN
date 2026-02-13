-- Migration: 007_fix_version_column_type.sql
-- Fix version column type to avoid 406 errors from Supabase REST API

-- Drop dependent view first
DROP VIEW IF EXISTS public.sync_operations;

-- Alter version column from BIGINT to INTEGER for better Supabase compatibility
ALTER TABLE public.encrypted_blobs 
ALTER COLUMN version TYPE INTEGER USING version::INTEGER;

-- Recreate the view
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

-- Also fix the RPC function parameter type
CREATE OR REPLACE FUNCTION public.insert_sync_operation(
    p_user_id UUID,
    p_entity_id UUID,
    p_entity_type VARCHAR(50),
    p_operation_type VARCHAR(20),
    p_version INTEGER,
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
