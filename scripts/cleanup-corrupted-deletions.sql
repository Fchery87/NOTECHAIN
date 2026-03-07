-- Cleanup invalid/corrupted deletion records from NoteChain
-- Run this in Supabase SQL Editor

-- Step 1: Preview what will be cleaned up
SELECT 
    id,
    blob_uuid,
    operation_type,
    is_deleted,
    LENGTH(nonce) as nonce_length,
    LEFT(encode(ciphertext, 'base64'), 30) as ciphertext_preview,
    'CORRUPTED' as issue
FROM public.encrypted_blobs
WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND blob_type = 'note'
    AND (
        -- Invalid placeholder data
        nonce = 'nonc'
        OR auth_tag = 'authTag='
        OR encode(ciphertext, 'base64') LIKE 'deleted%'
        OR encode(ciphertext, 'base64') LIKE 'deletec%'
        -- Wrong sizes
        OR LENGTH(nonce) != 24
        OR LENGTH(auth_tag) != 16
    );

-- Step 2: Count corrupted records
SELECT 
    COUNT(*) as corrupted_records,
    'Will be deleted' as action
FROM public.encrypted_blobs
WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND blob_type = 'note'
    AND (
        nonce = 'nonc'
        OR auth_tag = 'authTag='
        OR encode(ciphertext, 'base64') LIKE 'deleted%'
        OR encode(ciphertext, 'base64') LIKE 'deletec%'
        OR LENGTH(nonce) != 24
        OR LENGTH(auth_tag) != 16
    );

-- Step 3: Delete corrupted records
-- UNCOMMENT TO EXECUTE:
DELETE FROM public.encrypted_blobs
WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
AND blob_type = 'note'
AND (
nonce = 'nonc'
OR auth_tag = 'authTag='
OR encode(ciphertext, 'base64') LIKE 'deleted%'
OR encode(ciphertext, 'base64') LIKE 'deletec%'
OR LENGTH(nonce) != 24
OR LENGTH(auth_tag) != 16
);

-- Step 4: Verify cleanup
SELECT 
    COUNT(*) as remaining_valid_notes
 FROM public.encrypted_blobs
 WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
     AND blob_type = 'note'
     AND is_deleted = false
     AND LENGTH(nonce) = 24
     AND LENGTH(auth_tag) = 16;
