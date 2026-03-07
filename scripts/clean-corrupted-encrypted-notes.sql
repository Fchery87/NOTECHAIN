-- Supabase SQL Script to Clean Corrupted Encrypted Notes
-- Run in Supabase SQL Editor or via psql client

-- WARNING: This will DELETE all encrypted notes with invalid nonce size!
-- Only run if you're sure data is corrupted or for development purposes.

-- Check for blobs with invalid nonce (not 24 bytes when decoded)
-- Base64 encoding: 24 bytes = 32 chars, but some may be shorter/longer

-- Option 1: Safe approach - find and mark as deleted instead of deleting
UPDATE encrypted_blobs
SET is_deleted = true,
    updated_at = NOW()
WHERE
    blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'YOUR_USER_ID' -- Replace with your user ID
    AND (
        -- Check for invalid nonce (not exactly 32 base64 characters or doesn't decode properly)
        LENGTH(nonce) != 32
        OR nonce IS NULL
        OR auth_tag IS NULL
    );

-- Option 2: Nuclear approach - DELETE corrupted data (UNCOMMENT TO USE)
-- DELETE FROM encrypted_blobs
-- WHERE blob_type = 'note'
-- AND is_deleted = false
-- AND user_id = 'YOUR_USER_ID'
-- AND (LENGTH(nonce) != 32 OR nonce IS NULL OR auth_tag IS NULL);

-- Option 3: List affected rows first (RECOMMENDED)
SELECT
    id,
    user_id,
    blob_type,
    LENGTH(nonce) as nonce_length,
    nonce,
    auth_tag
FROM encrypted_blobs
WHERE
    blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'YOUR_USER_ID'
    AND (LENGTH(nonce) != 32 OR nonce IS NULL OR auth_tag IS NULL)
LIMIT 100;
