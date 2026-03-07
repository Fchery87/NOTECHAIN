-- NoteChain Deletion Cleanup Script
-- Run this in Supabase SQL Editor to fix deletion issues

-- ============================================================
-- STEP 1: Preview corrupted records (don't delete yet)
-- ============================================================
SELECT 
    id,
    blob_uuid,
    operation_type,
    is_deleted,
    LENGTH(nonce) as nonce_bytes,
    LENGTH(auth_tag) as auth_bytes,
    LEFT(encode(ciphertext, 'base64'), 20) as ciphertext_preview,
    'CORRUPTED - Will be deleted' as status
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

-- ============================================================
-- STEP 2: Count affected records
-- ============================================================
SELECT 
    COUNT(*) as records_to_delete,
    'Run Step 3 to delete these' as action
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

-- ============================================================
-- STEP 3: DELETE CORRUPTED RECORDS
-- UNCOMMENT THE FOLLOWING LINES AND RUN:
-- ============================================================
/*
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
*/

-- ============================================================
-- STEP 4: Verify cleanup (run after Step 3)
-- ============================================================
/*
SELECT 
    COUNT(*) as valid_notes_remaining,
    'Your app should work now!' as status
FROM public.encrypted_blobs
WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND blob_type = 'note'
    AND is_deleted = false
    AND LENGTH(nonce) = 24
    AND LENGTH(auth_tag) = 16;
*/

-- ============================================================
-- INSTRUCTIONS:
-- 1. Run Step 1 and Step 2 to see what will be deleted
-- 2. Uncomment Step 3 and run it to delete corrupted records
-- 3. Uncomment Step 4 and run it to verify
-- 4. Refresh your browser - deletions should work now!
-- ============================================================
