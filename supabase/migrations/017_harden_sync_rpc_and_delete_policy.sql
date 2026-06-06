-- Migration: 017_harden_sync_rpc_and_delete_policy.sql
-- Purpose:
-- 1. Prevent callers from writing sync operations for another user through
--    the SECURITY DEFINER RPC.
-- 2. Remove anonymous execute access from the sync RPC.
-- 3. Allow authenticated users to delete only their own encrypted blobs.

-- The sync RPC is kept for client compatibility, but it now treats auth.uid()
-- as the source of authority and rejects mismatched p_user_id values.
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
    v_auth_uid UUID;
BEGIN
    v_auth_uid := auth.uid();

    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF p_user_id IS NULL OR p_user_id <> v_auth_uid THEN
        RAISE EXCEPTION 'not authorized to write sync operations for this user';
    END IF;

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
        metadata_hash,
        is_deleted
    ) VALUES (
        v_auth_uid,
        p_entity_id,
        p_entity_type,
        p_operation_type,
        p_version,
        p_session_id,
        p_ciphertext,
        p_nonce,
        p_auth_tag,
        p_key_id,
        p_metadata_hash,
        p_operation_type = 'delete'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;

    -- This branch is only reached if a future unique constraint causes an
    -- upsert conflict. Keep it scoped to auth.uid() to avoid cross-user writes.
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
            is_deleted = p_operation_type = 'delete',
            updated_at = NOW()
        WHERE user_id = v_auth_uid AND blob_uuid = p_entity_id
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.insert_sync_operation(
    UUID, UUID, VARCHAR, VARCHAR, INTEGER, UUID, BYTEA, BYTEA, BYTEA, UUID, BYTEA
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_sync_operation(
    UUID, UUID, VARCHAR, VARCHAR, INTEGER, UUID, BYTEA, BYTEA, BYTEA, UUID, BYTEA
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_sync_operation(
    UUID, UUID, VARCHAR, VARCHAR, INTEGER, UUID, BYTEA, BYTEA, BYTEA, UUID, BYTEA
) TO authenticated;

DROP POLICY IF EXISTS "Users can delete own encrypted blobs" ON public.encrypted_blobs;
CREATE POLICY "Users can delete own encrypted blobs" ON public.encrypted_blobs
    FOR DELETE
    USING (user_id = auth.uid());
