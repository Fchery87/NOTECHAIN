# SQL Diagnostic Queries for NoteChain Encryption Issues

Run these queries in your Supabase SQL Editor to diagnose the "bad nonce size" errors.

## Query 1: Check Sample Encrypted Data

```sql
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
```

## Query 2: Check Nonce Validity

```sql
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
```

## Query 3: Count Valid vs Invalid

```sql
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
```

## Query 4: Delete Corrupted Notes (⚠️ DESTRUCTIVE)

**WARNING:** This will permanently delete notes with invalid encryption. Only run this if you're sure you want to delete them.

```sql
-- Delete corrupted notes (nonce not 24 bytes)
DELETE FROM public.encrypted_blobs
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND LENGTH(nonce) != 24;
```

## Query 5: Mark as Deleted (Safer Alternative)

```sql
-- Mark corrupted notes as deleted instead of permanent deletion
UPDATE public.encrypted_blobs
SET is_deleted = true,
    updated_at = NOW()
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND LENGTH(nonce) != 24;
```

---

## Expected Results

- **nonce_bytes should be 24** for valid data
- **auth_tag_bytes should be 16** for valid data
- If you see different sizes, the data is corrupted

## Next Steps

1. Run Query 3 first to see how many notes are affected
2. If most are invalid, you may need to delete them
3. If only a few are invalid, you can delete just those
4. After cleaning corrupted data, your app should work normally
