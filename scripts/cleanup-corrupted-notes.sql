-- Clean up corrupted notes from NoteChain
-- These notes have invalid encryption data (placeholder text instead of real encryption)

-- First, let's see what will be deleted
SELECT 
    id,
    LENGTH(nonce) as nonce_bytes,
    LENGTH(auth_tag) as auth_tag_bytes,
    'WILL BE DELETED' as action
FROM public.encrypted_blobs
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND (LENGTH(nonce) != 24 OR LENGTH(auth_tag) != 16);

-- Count how many will be deleted
SELECT 
    COUNT(*) as corrupted_notes_count,
    'Ready to delete' as status
FROM public.encrypted_blobs
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND (LENGTH(nonce) != 24 OR LENGTH(auth_tag) != 16);

-- UNCOMMENT THE FOLLOWING LINE TO ACTUALLY DELETE THE CORRUPTED NOTES:
-- DELETE FROM public.encrypted_blobs
-- WHERE blob_type = 'note'
--     AND is_deleted = false
--     AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
--     AND (LENGTH(nonce) != 24 OR LENGTH(auth_tag) != 16);

-- Alternative: Mark as deleted instead of permanent deletion (SAFER):
-- UPDATE public.encrypted_blobs
-- SET is_deleted = true,
--     updated_at = NOW()
-- WHERE blob_type = 'note'
--     AND is_deleted = false
--     AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
--     AND (LENGTH(nonce) != 24 OR LENGTH(auth_tag) != 16);
