# NoteChain Supabase Configuration

This directory contains Supabase configuration, database migrations, and Edge Functions for the NoteChain application.

## Directory Structure

```
supabase/
├── config.toml              # Supabase CLI configuration
├── migrations/
│   ├── README.md            # Migration documentation
│   ├── 001_initial_schema.sql  # Core database schema
│   └── 002_storage_buckets.sql # Storage bucket configuration
├── functions/
│   └── README.md            # Edge Functions documentation
└── deploy.md                # Deployment guide
```

## Quick Start

### 1. Install Supabase CLI

```bash
bun install -g supabase
export PATH="$HOME/.bun/install/global/node_modules/supabase/bin:$PATH"
```

### 2. Start Local Supabase

```bash
supabase start
# or with bun
bun run supabase:start
```

### 3. Run Migrations

```bash
supabase db push
# or reset and re-apply
supabase db reset
```

### 4. Generate Types

```bash
# Generate TypeScript types from schema
cd packages/data-models
bun run generate:db-types
```

## Database Schema

The database uses a zero-knowledge architecture where:

- **Users**: Managed by Supabase Auth, profiles store only email hash for privacy
- **Data**: All content is encrypted client-side before storage (AES-256-GCM)
- **RLS**: Row Level Security ensures users can only access their own data
- **Sync**: CRDT-compatible versioning for multi-device synchronization

### Core Tables

| Table             | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `profiles`        | User profiles with encrypted preferences       |
| `devices`         | Device management for multi-device sync        |
| `encrypted_blobs` | Encrypted content storage (notes, todos, PDFs) |
| `sync_metadata`   | Sync state tracking per device                 |
| `subscriptions`   | Billing and tier information                   |
| `notes`           | Note metadata with content hashes              |
| `notebooks`       | Notebook organization                          |
| `todos`           | Todo items with priorities and dates           |
| `projects`        | Project/task organization                      |
| `pdf_documents`   | PDF metadata and storage references            |
| `pdf_annotations` | PDF annotations and signatures                 |

## Row Level Security

All tables have RLS enabled with policies ensuring:

- Users can only access their own data
- No server-side access to unencrypted content
- Device trust verification for sync operations

## Storage Buckets

Three buckets are configured for encrypted file storage:

- `pdfs` - Encrypted PDF documents
- `attachments` - Encrypted file attachments
- `thumbnails` - Encrypted document thumbnails

## Environment Variables

See `.env.example` in the root directory for required environment variables.

## Deployment

See `deploy.md` for production deployment instructions.
