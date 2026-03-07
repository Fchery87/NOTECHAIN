# Clean Up Corrupted Notes

Based on the diagnostic query, you have notes with corrupted encryption data.

## What We Found

**Corrupted Notes** (3 notes with placeholder data):

- `e9700c00-3258-4f49-a086-70dbd7ba4c66`
- `29eb74de-4db6-478c-a724-275cb6fec64e`
- `89392be2-2fca-4143-87b6-ddbb5a1a7184`

These have invalid data like:

- `ciphertext`: `deletec=` (5 bytes)
- `nonce`: `nonc` (3 bytes)
- `auth_tag`: `authTag=` (5 bytes)

**Expected sizes**:

- nonce: 24 bytes
- auth_tag: 16 bytes

## Step 1: Preview What Will Be Deleted

Run this to see what will be cleaned up:

```sql
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
```

## Step 2: Delete Corrupted Notes

**Option A: Permanent Delete** (Cannot be undone)

```sql
DELETE FROM public.encrypted_blobs
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND (LENGTH(nonce) != 24 OR LENGTH(auth_tag) != 16);
```

**Option B: Mark as Deleted** (Safer - can be recovered)

```sql
UPDATE public.encrypted_blobs
SET is_deleted = true,
    updated_at = NOW()
WHERE blob_type = 'note'
    AND is_deleted = false
    AND user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND (LENGTH(nonce) != 24 OR LENGTH(auth_tag) != 16);
```

## After Cleaning

1. Refresh your browser
2. The "bad nonce size" errors should disappear
3. You should be able to create new notes normally
4. Your existing valid note (`0b8726c3-3afe-4f4c-a26e-c11f6a33bc6d`) should load correctly
