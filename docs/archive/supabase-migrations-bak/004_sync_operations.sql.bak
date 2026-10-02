-- Migration: 004_sync_operations.sql
-- Adds sync operation tracking to encrypted_blobs table

-- Add columns for sync tracking if they don't exist
ALTER TABLE public.encrypted_blobs 
ADD COLUMN IF NOT EXISTS operation_type VARCHAR(20) DEFAULT 'create',
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS blob_uuid UUID DEFAULT uuid_generate_v4();

-- Create index for sync queries
CREATE INDEX IF NOT EXISTS idx_blobs_session ON public.encrypted_blobs(session_id);

-- Create a view for sync operations
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

-- Function to insert sync operation
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
