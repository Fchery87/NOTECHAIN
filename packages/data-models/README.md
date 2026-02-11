# @notechain/data-models

TypeScript interfaces and Supabase type definitions for NoteChain.

## Exports

### Core Types

- `User` - User profile and settings
- `Note` - Rich text note content
- `Todo` - Task with priorities and due dates
- `Notebook` - Folder organization
- `Project` - Tag-based collections

### Sync Types

- `Device` - Registered devices
- `SyncState` - CRDT sync metadata
- `ConflictEntry` - Merge conflict records

### Supabase Types

- `Database` - Full Supabase schema types
- `Tables` - Individual table types
- `Enums` - PostgreSQL enum types

## Dependencies

- No runtime dependencies

## Usage

```typescript
import { Note, User, Database } from '@notechain/data-models';

const note: Note = {
  id: 'uuid',
  title: 'My Note',
  content: 'Encrypted content here',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```
