-- Diagnostic SQL to check encrypted blob data
-- Run this in your Supabase SQL Editor to see what's in the database

-- Check a sample of encrypted_blobs to see the data format
SELECT 
    id,
    user_id,
    blob_type,
    LENGTH(ciphertext) as ciphertext_bytes,
    LENGTH(nonce) as nonce_bytes,
    LENGTH(auth_tag) as auth_tag_bytes,
    encode(ciphertext, 'base64') as ciphertext_b64_sample,
    encode(nonce, 'base64') as nonce_b64,
    encode(auth_tag, 'base64') as auth_tag_b64
FROM public.encrypted_blobs
WHERE blob_type = 'note' 
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
LIMIT 5;

-- Check if any nonces are not 24 bytes (the correct size for XSalsa20)
SELECT 
    id,
    LENGTH(nonce) as nonce_length,
    CASE 
        WHEN LENGTH(nonce) = 24 THEN 'VALID'
        ELSE 'INVALID'
    END as nonce_status
FROM public.encrypted_blobs
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929';

-- Count valid vs invalid
SELECT 
    CASE 
        WHEN LENGTH(nonce) = 24 THEN 'VALID (24 bytes)'
        ELSE 'INVALID (' || LENGTH(nonce) || ' bytes)'
    END as nonce_status,
    COUNT(*) as count
FROM public.encrypted_blobs
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
GROUP BY LENGTH(nonce);
