# @notechain/sync-engine

CRDT-based synchronization logic for offline-first data sync.

## Features

- Conflict-free Replicated Data Types (CRDT)
- Last-write-wins conflict resolution
- Offline operation queue
- Supabase Realtime integration
- Manual merge support

## Exports

- `SyncEngine` - Main sync coordinator
- `createNoteOperation()` - Note mutation factory
- `mergeState()` - State reconciliation
- `pushChanges()` - Upload queued changes
- `pullChanges()` - Download remote updates

## Dependencies

- No runtime dependencies

## Usage

```typescript
import { SyncEngine } from '@notechain/sync-engine';

const sync = new SyncEngine({
  supabase,
  deviceId,
  onConflict: (local, remote) => handleMerge(local, remote),
});

await sync.start();
```
