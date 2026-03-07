# NoteChain API Reference

> **Note:** NoteChain is a client-side application that uses Supabase as its backend. There is no separate API server. This document describes the data model and Supabase integration for reference.

## Architecture Overview

NoteChain uses **Supabase** as its backend, providing:

- PostgreSQL database with Row Level Security (RLS)
- Authentication via Supabase Auth
- Real-time subscriptions via Supabase Realtime
- File storage via Supabase Storage

**Data Flow:**

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Client App  │────▶│  Supabase API  │────▶│  PostgreSQL    │
│  (Next.js)   │     │  (PostgREST)    │     │  (Database)     │
└─────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Browser Local          Real-time              Encrypted Data
   (IndexedDB)          Subscriptions            (XSalsa20-Poly1305)
```

## Authentication

### Supabase Auth Integration

The application uses `@supabase/ssr` for server-side and client-side authentication:

```typescript
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Supported Methods

- **Email/Password**: Standard authentication
- **OAuth**: Google, Microsoft, GitHub, Apple
- **Magic Links**: Email-based passwordless auth
- **Session Management**: HTTP-only cookies

## Database Schema

### Core Tables

#### `profiles`

User profile data with RLS:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `encrypted_blobs`

Main storage for encrypted user data:

```sql
CREATE TABLE encrypted_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'note', 'todo', 'pdf', etc.
  entity_id VARCHAR(255) NOT NULL,
  encrypted_data BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  auth_tag BYTEA NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_entity UNIQUE(user_id, entity_type, entity_id)
);
```

#### `devices`

Device management for multi-device sync:

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sync_operations`

Operations log for CRDT sync:

```sql
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  operation_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  encrypted_data BYTEA,
  device_id UUID REFERENCES devices(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

All tables have RLS policies enforcing:

- Users can only access their own data
- `user_id` column must match authenticated user ID
- Service role key bypasses RLS for background operations

## Data Access Patterns

### Querying Data

#### Via Supabase Client (TypeScript)

```typescript
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(url, key);

// Get notes
const { data: notes, error } = await supabase
  .from('encrypted_blobs')
  .select('*')
  .eq('user_id', userId)
  .eq('entity_type', 'note')
  .order('updated_at', { ascending: false });
```

#### Via Dexie (IndexedDB)

```typescript
import { useLiveQuery } from 'dexie-react-hooks';

function NotesList() {
  const notes = useLiveQuery(() => db.notes.toArray());
  return <div>{notes.map(note => <Note key={note.id} />)}</div>;
}
```

### Creating Data

#### Encrypted Storage Flow

```typescript
import { encrypt } from '@notechain/core-crypto';

// 1. Encrypt data locally
const key = await getEncryptionKey();
const { ciphertext, nonce, authTag } = encrypt(plaintext, key);

// 2. Store in Supabase
await supabase.from('encrypted_blobs').insert({
  user_id: userId,
  entity_type: 'note',
  entity_id: noteId,
  encrypted_data: ciphertext,
  nonce: nonce,
  auth_tag: authTag,
});
```

### Real-time Updates

#### Supabase Realtime Subscriptions

```typescript
// Subscribe to note changes
const subscription = supabase
  .channel('notes-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'encrypted_blobs',
      filter: `user_id=eq.${userId}`,
    },
    payload => {
      handleRealtimeUpdate(payload);
    }
  )
  .subscribe();
```

### Sync Operations

#### Enqueueing Changes

```typescript
async function syncChange(operation) {
  const { ciphertext, nonce, authTag } = encrypt(data, key);

  await supabase.from('sync_operations').insert({
    user_id: userId,
    operation_type: operation.type,
    entity_type: operation.entity,
    entity_id: operation.id,
    encrypted_data: ciphertext,
    nonce: nonce,
    auth_tag: authTag,
    device_id: deviceId,
    timestamp: new Date().toISOString(),
  });
}
```

#### Fetching Changes

```typescript
async function fetchChanges(since) {
  const { data: changes } = await supabase
    .from('sync_operations')
    .select('*')
    .gt('timestamp', since)
    .order('timestamp', { ascending: true });

  return changes;
}
```

## Encryption Model

### XSalsa20-Poly1305

All data is encrypted before storage:

```typescript
interface EncryptedData {
  ciphertext: Uint8Array; // Encrypted content
  nonce: Uint8Array; // Random nonce (24 bytes)
  authTag: Uint8Array; // Poly1305 authentication tag (16 bytes)
}
```

### Storage Format

In PostgreSQL:

```sql
INSERT INTO encrypted_blobs (
  encrypted_data,
  nonce,
  auth_tag
) VALUES (
  decode('\x' || ciphertext_hex, 'hex'),
  decode('\x' || nonce_hex, 'hex'),
  decode('\x' || auth_tag_hex, 'hex')
);
```

## AI Integration

### Local Processing

All AI features run in the browser using **Transformers.js**:

```typescript
import { pipeline } from '@xenova/transformers';

// Load model (local)
const generator = await pipeline('summarization', 'Xenova/distilbart');

// Generate summary (100% local)
const summary = await generator(text);
```

### No API Calls

- ✅ No data sent to OpenAI
- ✅ No data sent to Anthropic
- ✅ No data sent to cloud AI services
- ✅ 100% browser-based processing

## Error Handling

### Database Errors

```typescript
const { data, error } = await supabase.from('encrypted_blobs').insert(noteData);

if (error) {
  switch (error.code) {
    case '23505': // Unique constraint violation
      handleConflict();
      break;
    case '23503': // Foreign key violation
      handleInvalidReference();
      break;
    default:
      handleGenericError(error);
  }
}
```

### Common Error Codes

| Supabase Code | PostgreSQL Code       | Description             |
| ------------- | --------------------- | ----------------------- |
| PGRST116      | N/A                   | No rows found           |
| 23505         | unique_violation      | Constraint violation    |
| 23503         | foreign_key_violation | Invalid reference       |
| 23514         | check_violation       | Check constraint failed |

## Client-Side Storage

### IndexedDB via Dexie

```typescript
import Dexie from 'dexie';

const db = new Dexie('NoteChainDB');

db.version(1).stores({
  notes: 'id, title, tags, updated_at',
  todos: 'id, title, priority, due_date, completed',
  pdfs: 'id, title, metadata',
  encrypted_blobs: 'id, entity_type, entity_id, updated_at',
});

// CRUD operations
await db.notes.add(note);
await db.notes.update(id, changes);
await db.notes.delete(id);
const allNotes = await db.notes.toArray();
```

### Sync Flow

```
┌─────────────┐
│  UI Action  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Update     │
│  IndexedDB  │ (Optimistic)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Encrypt    │
│  Data       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Queue Sync │
│  Operation  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Supabase   │
│  API Call   │ (Background)
└─────────────┘
```

## Environment Variables

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

### Optional

```env
NEXT_PUBLIC_NEON_DATABASE_URL=postgresql://xxx
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_MAX_FREE_DEVICES=1
```

## Future API Plans

### Potential Future Endpoints

These are **not currently implemented** but may be added in future versions:

- REST API wrapper around Supabase (for third-party integrations)
- GraphQL endpoint (for flexible queries)
- Webhook system (for event notifications)
- OAuth2 authorization server (for third-party apps)

**Note:** Current architecture uses Supabase directly. Future API endpoints would be additional layers on top of Supabase.

## Resources

### Supabase Documentation

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Client Libraries](https://supabase.com/docs/reference/javascript)

### Client Libraries

- [@supabase/ssr](https://github.com/supabase/supabase-js)
- [@supabase/supabase-js](https://github.com/supabase/supabase-js)
- [Dexie.js](https://dexie.org/)
- [dexie-react-hooks](https://dexie.org/docs/dexie-react-hooks)

## Support

- [Supabase Status](https://status.supabase.com)
- [Supabase Dashboard](https://app.supabase.com)
- NoteChain Documentation: [docs/](../)
- Email: support@notechain.tech
