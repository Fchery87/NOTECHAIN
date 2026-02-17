
-- Fix for PGRST203: Ambiguous function resolution
-- Drop overloaded versions to ensure single candidate

DROP FUNCTION IF EXISTS public.insert_sync_operation(uuid, uuid, varchar, varchar, integer, uuid, bytea, bytea, bytea, uuid, bytea);
DROP FUNCTION IF EXISTS public.insert_sync_operation(uuid, uuid, varchar, varchar, bigint, uuid, bytea, bytea, bytea, uuid, bytea);

-- Re-create the function with BIGINT version
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.insert_sync_operation TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_sync_operation TO anon;
