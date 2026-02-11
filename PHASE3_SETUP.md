# Phase 3: Sync Layer Implementation

## Overview

Phase 3 implements the CRDT-based sync layer that connects local IndexedDB with Supabase for real-time, offline-first data synchronization.

## What Was Created

### 1. Sync Adapter (`src/lib/supabase/syncAdapter.ts`)

- Implements `SyncRepositoryAdapter` interface
- Connects sync engine to Supabase backend
- Handles encrypted payload parsing/serialization
- Real-time subscriptions via Supabase Realtime

### 2. Sync Provider (`src/lib/sync/SyncProvider.tsx`)

- React context for sync state management
- Auto-initializes when user logs in
- Network-aware syncing (syncs when back online)
- Exposes sync status and manual trigger

### 3. Database Migration (`supabase/migrations/004_sync_operations.sql`)

Adds sync-specific features to existing schema:

- `operation_type` column (create/update/delete)
- `session_id` column for tracking
- `blob_uuid` column for entity identification
- `insert_sync_operation` RPC function
- `sync_operations` view for querying

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App     │────▶│   SyncProvider   │────▶│   SyncService   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                              ┌─────────────────────────┘
                              ▼
                        ┌──────────────────┐
                        │ SupabaseAdapter  │
                        └──────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌──────────────┐      ┌──────────────┐
            │   Supabase   │      │  IndexedDB   │
            │   (Cloud)    │      │  (Local)     │
            └──────────────┘      └──────────────┘
```

## Features Implemented

✅ **Offline-First**: Changes queued locally, synced when online
✅ **Real-time**: Live sync via Supabase Realtime subscriptions
✅ **Conflict Resolution**: LWW (Last-Writer-Wins) CRDT algorithm
✅ **Encryption-Ready**: Payloads support ciphertext:nonce:authTag format
✅ **Network Awareness**: Auto-sync when connection restored
✅ **Session Tracking**: Each device has unique session ID

## Database Schema Updates

### encrypted_blobs table additions:

```sql
operation_type VARCHAR(20)  -- 'create', 'update', 'delete'
session_id UUID             -- Device session identifier
blob_uuid UUID              -- Entity unique identifier
```

### New RPC Function:

```sql
insert_sync_operation(...)  -- Upsert with conflict resolution
```

## Usage

### In Components:

```tsx
import { useSync } from '@/lib/sync/SyncProvider';

function MyComponent() {
  const { status, triggerSync, isInitialized } = useSync();

  return (
    <div>
      {status.isSyncing && <span>Syncing...</span>}
      <button onClick={triggerSync}>Sync Now</button>
    </div>
  );
}
```

### Sync Operations:

```tsx
import { useSync } from '@/lib/sync/SyncProvider';

async function saveNote(noteData) {
  const { syncService } = useSync();

  await syncService?.enqueueOperation({
    userId: currentUser.id,
    sessionId: sessionId,
    operationType: 'create',
    entityType: 'note',
    entityId: noteData.id,
    encryptedPayload: `${ciphertext}:${nonce}:${authTag}`,
    version: 1,
  });
}
```

## Apply Migration

Run this SQL in Supabase Dashboard:

1. Go to: https://app.supabase.com/project/kryeeloydyfnqkesvdnp/sql/new
2. Open: `apply_sync_migration.sql`
3. Copy contents and click **Run**

Or copy from: `/home/nochaserz/Documents/Coding Projects/NOTECHAIN/apply_sync_migration.sql`

## Next Steps

To complete the sync integration:

1. **Apply the migration** (see above)
2. **Update Note/Todo components** to use sync operations
3. **Add sync indicators** in UI (syncing spinner, last synced time)
4. **Test offline mode** (disconnect wifi, make changes, reconnect)
5. **Test multi-device sync** (open in two browsers)

## Files Created/Modified

| File                                          | Purpose                        |
| --------------------------------------------- | ------------------------------ |
| `src/lib/supabase/syncAdapter.ts`             | Supabase backend adapter       |
| `src/lib/sync/SyncProvider.tsx`               | React context for sync         |
| `src/app/layout.tsx`                          | Added SyncProvider wrapper     |
| `supabase/migrations/004_sync_operations.sql` | Database migration             |
| `apply_sync_migration.sql`                    | Copy for easy access           |
| `packages/sync-engine/src/index.ts`           | Exported SyncRepositoryAdapter |

## Testing

After applying migration:

```bash
cd apps/web && bun run dev
```

1. Sign in
2. Open browser DevTools → Network tab
3. Create a note
4. Should see WebSocket connections to Supabase
5. Check Supabase Dashboard → Table Editor → encrypted_blobs

## Phase 3 Status: ✅ COMPLETE

The sync infrastructure is ready. Next phase would be integrating sync operations into the actual note/todo CRUD operations.
