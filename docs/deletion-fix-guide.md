# NoteChain Deletion System - Complete Fix Guide

## Problem Summary

When you delete a note in NoteChain and refresh the browser, the deleted notes were reappearing. This was caused by multiple issues in the deletion/sync flow.

## Root Causes Found

### 1. **Corrupted Deletion Records** (Database)

The code was using placeholder text `'deleted:nonce:authTag'` instead of proper encrypted data for deletions, creating invalid records with:

- `nonce`: `nonc` (3 bytes instead of 24)
- `auth_tag`: `authTag=` (5 bytes instead of 16)

### 2. **No Filtering for Deleted Notes** (Frontend)

The `useNotesSync` hook was loading ALL notes including deleted ones, without checking the `operationType` field.

### 3. **Offline Deletions Not Queued** (Frontend)

When deleting while offline, the deletion wasn't being queued because the code only queued operations if `noteData` existed.

### 4. **Improper Query Filter** (Backend)

The query for fetching notes used `.or('is_deleted.is.null,is_deleted.eq.false')` which could be unreliable.

---

## Fixes Applied

### ✅ Fix 1: Filter Deleted Notes

**File**: `apps/web/src/lib/sync/useNotesSync.ts`

Added check to skip notes with `operationType === 'delete'`:

```typescript
if (raw.operationType === 'delete') {
  console.log(`[useNotesSync] Skipping deleted note ${raw.entityId}`);
  continue;
}
```

### ✅ Fix 2: Proper Offline Queue Handling

**File**: `apps/web/src/lib/sync/useNotesSync.ts`

Rewrote `syncNoteOperation` to:

- Queue deletions even without `noteData`
- Use proper encrypted payload for deletions (not placeholder text)
- Handle all error cases consistently

### ✅ Fix 3: Fixed Query Filter

**File**: `apps/web/src/lib/supabase/syncAdapter.ts`

Changed from:

```typescript
.or('is_deleted.is.null,is_deleted.eq.false')
```

To:

```typescript
.eq('is_deleted', false)
```

### ✅ Fix 4: Repository BYTEA Handling

**Files**: All repository files

Fixed Supabase BYTEA (binary) to base64 conversion for proper decryption.

---

## Action Required

### Step 1: Clean Up Corrupted Data

Run this SQL in your Supabase SQL Editor:

```sql
-- Preview what will be deleted
SELECT
    id,
    blob_uuid,
    LENGTH(nonce) as nonce_length,
    LENGTH(auth_tag) as auth_tag_length,
    'CORRUPTED - Will Delete' as action
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
```

### Step 2: Delete Corrupted Records

```sql
-- Delete corrupted records
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
```

### Step 3: Verify Cleanup

```sql
-- Count remaining valid notes
SELECT
    COUNT(*) as valid_notes,
    'Ready to use' as status
FROM public.encrypted_blobs
WHERE user_id = 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929'
    AND blob_type = 'note'
    AND is_deleted = false
    AND LENGTH(nonce) = 24
    AND LENGTH(auth_tag) = 16;
```

---

## Testing Checklist

After cleanup, test the deletion flow:

1. **Create a new note** → Should appear in list
2. **Refresh browser** → Note should still be there
3. **Delete the note** → Should disappear from list
4. **Refresh browser** → Deleted note should NOT reappear ✅
5. **Create note offline** → Should work
6. **Delete note offline** → Should work
7. **Come back online** → Should sync both operations

---

## Files Modified

| File                                      | Change                                                     |
| ----------------------------------------- | ---------------------------------------------------------- |
| `lib/sync/useNotesSync.ts`                | Filter deleted notes, fix offline queue, proper encryption |
| `lib/supabase/syncAdapter.ts`             | Fix query filter for deleted notes                         |
| `lib/repositories/NoteRepository.ts`      | BYTEA to base64 conversion                                 |
| `lib/repositories/TodoRepository.ts`      | BYTEA to base64 conversion                                 |
| `lib/repositories/PDFRepository.ts`       | BYTEA to base64 conversion                                 |
| `lib/repositories/AnalyticsRepository.ts` | BYTEA to base64 conversion                                 |
| `lib/sync/encryptedSyncService.ts`        | Browser-compatible base64                                  |
| `lib/supabase/syncAdapter.ts`             | Browser-compatible base64                                  |
| `lib/pdfSharing.ts`                       | Browser-compatible base64                                  |
| `lib/signatureStorage.ts`                 | Browser-compatible base64                                  |

---

## Architecture Summary

### Data Flow for Deletion

1. **User clicks delete** → UI calls `syncDeleteNote()`
2. **Offline or error** → Queued in `offlineQueue` with `operationType: 'delete'`
3. **Online** → Sent to Supabase via `insert_sync_operation` RPC
4. **Database** → Sets `is_deleted = true` and `operation_type = 'delete'`
5. **Sync view** → `sync_operations` view reflects changes
6. **App loads** → `fetchUserNotes()` filters `is_deleted = false`
7. **UI renders** → `useNotesSync` skips notes with `operationType === 'delete'`

### Soft Delete Strategy

- Records are **NEVER** permanently deleted from database
- `is_deleted` flag marks them as deleted
- `operation_type` tracks the last operation
- Deleted notes are filtered out in queries
- Can be recovered by setting `is_deleted = false`

---

## Security Considerations

✅ **Encryption**: All notes encrypted with XSalsa20-Poly1305
✅ **Soft Delete**: Records preserved for audit/recovery
✅ **Offline Support**: Operations queued and synced when online
✅ **User Isolation**: All queries filtered by `user_id`
✅ **RLS**: Row Level Security enabled on all tables

---

## Troubleshooting

### If deleted notes still appear after refresh:

1. Check browser console for errors
2. Verify SQL cleanup was run successfully
3. Hard refresh browser (Ctrl+Shift+R)
4. Check that `is_deleted` is `true` in database:
   ```sql
   SELECT id, is_deleted, operation_type
   FROM encrypted_blobs
   WHERE blob_uuid = 'YOUR_NOTE_ID';
   ```

### If deletion fails:

1. Check network connection
2. Look for console errors
3. Verify encryption service initialized
4. Check offline queue: `await offlineQueue.getAll()` in console
