# NoteChain Deletion Flow Audit & Fixes

## Issues Found

### 1. **Invalid Encrypted Payload for Deletions** (CRITICAL)

**File**: `apps/web/src/lib/sync/useNotesSync.ts` (lines 169-171)

**Problem**: When deleting notes, the code uses `'deleted:nonce:authTag'` as a placeholder, which creates invalid encrypted data in the database.

**Fix**: Deletions should still use proper encryption or use a different field to mark deletion.

### 2. **Offline Queue Doesn't Handle Deletions** (CRITICAL)

**File**: `apps/web/src/lib/sync/useNotesSync.ts` (lines 182-194)

**Problem**: When deleting offline, the deletion is not queued because the code only queues operations if `noteData` exists.

**Fix**: Queue deletions even without noteData.

### 3. **sync_operations View Query Issue**

**File**: `apps/web/src/lib/supabase/syncAdapter.ts` (line 218)

**Problem**: The query uses `.or('is_deleted.is.null,is_deleted.eq.false')` which might not properly filter in all cases.

**Fix**: Use explicit filter.

### 4. **useNotesSync Doesn't Filter Deleted Notes** (FIXED)

**File**: `apps/web/src/lib/sync/useNotesSync.ts`

**Status**: Already fixed - now skips notes with `operationType === 'delete'`.

---

## SQL Fixes to Apply

### Fix 1: Clean Up Invalid Deletion Records

Run this to remove the corrupted deletion records:

```sql
-- Delete invalid deletion records (those with 'deleted:nonce:authTag' payload)
DELETE FROM public.encrypted_blobs
WHERE encrypted_payload LIKE 'deleted:%'
   OR encrypted_payload LIKE 'deletec=%'
   OR nonce = 'nonc'
   OR auth_tag = 'authTag=';
```

### Fix 2: Ensure Proper Deletion Records

Check if there are any records with operation_type='delete' but is_deleted=false:

```sql
-- Find inconsistent deletion records
SELECT
    id,
    blob_uuid,
    operation_type,
    is_deleted,
    CASE
        WHEN operation_type = 'delete' AND is_deleted = false THEN 'INCONSISTENT'
        ELSE 'OK'
    END as status
FROM public.encrypted_blobs
WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND blob_type = 'note';
```

Fix inconsistent records:

```sql
-- Fix inconsistent deletion records
UPDATE public.encrypted_blobs
SET is_deleted = true
WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND blob_type = 'note'
    AND operation_type = 'delete'
    AND is_deleted = false;
```

---

## Code Fixes Applied

### Fix 1: Filter Deleted Notes in useNotesSync

**Status**: ✅ Already applied

```typescript
// Skip deleted notes
if (raw.operationType === 'delete') {
  console.log(`[useNotesSync] Skipping deleted note ${raw.entityId}`);
  continue;
}
```

### Fix 2: Fix sync_operations View Query

**File**: `apps/web/src/lib/supabase/syncAdapter.ts`

Change line 218 from:

```typescript
.or('is_deleted.is.null,is_deleted.eq.false')
```

To:

```typescript
.eq('is_deleted', false)
```

### Fix 3: Fix Offline Queue for Deletions

**File**: `apps/web/src/lib/sync/useNotesSync.ts` (lines 131-165)

The offline queue should handle deletions even when noteData is undefined.

### Fix 4: Use Proper Encryption for Deletions

**File**: `apps/web/src/lib/sync/useNotesSync.ts` (lines 169-171)

Instead of placeholder text, either:

- Encrypt a minimal deletion payload
- Or use a dedicated deletion marker that's not treated as encrypted data

---

## Testing Checklist

After applying fixes:

1. **Create a note** → Should sync to Supabase
2. **Delete the note** → Should set is_deleted=true in Supabase
3. **Refresh browser** → Deleted note should NOT appear
4. **Create note offline** → Should queue for sync
5. **Delete note offline** → Should queue for sync
6. **Come back online** → Should sync both operations

---

## Migration SQL

If needed, run this to ensure all deleted notes are properly marked:

```sql
-- Ensure all deleted notes have proper flags
UPDATE public.encrypted_blobs
SET
    is_deleted = true,
    updated_at = NOW()
WHERE
    user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND blob_type = 'note'
    AND (
        operation_type = 'delete'
        OR encrypted_payload LIKE 'deleted:%'
        OR nonce = 'nonc'
    );
```
