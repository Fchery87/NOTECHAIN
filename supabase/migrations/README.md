# Supabase Database Migrations

This directory contains SQL migration files that define the NoteChain database schema.

## Applying Migrations

```bash
# Start local Supabase
bun run supabase:start

# Push migrations to local database
bun run supabase:push

# Or use Supabase CLI directly
supabase db push
```

## Migration Files

| File                      | Description                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `001_baseline_schema.sql` | Base schema: profiles, encrypted_blobs, sync_operations view, sync RPC, signup trigger, role |
| `005`–`020` `_*.sql`      | Incremental changes: admin dashboard, audit logs, sessions, owner role, sync RPC hardening   |

Numbers `002` to `004` are intentionally unused. The early drafts that held them
(`notes`, `todos`, `notebooks`, `devices`, `pdf_*` tables and storage buckets) are
in `docs/archive/supabase-migrations-bak/`. The app never queried those tables, so
they were not carried into the baseline.

### Existing databases

`001_baseline_schema.sql` creates an object only when it is missing, so on a
database that already has the schema it changes nothing. Because it sorts before
migrations that are already recorded, mark it applied rather than letting the CLI
treat it as out of order:

```bash
supabase migration repair --status applied 001
```

### Verifying

`bun run verify:db` builds a scratch database from these files, runs behavior checks
(signup trigger, row-level security, the hardened sync RPC), and confirms the
baseline is a no-op on a migrated database.

## Naming Convention

Migrations follow the pattern: `NNN_description.sql`

- `NNN` - Three-digit sequence number
- `description` - Brief description of changes

## Rollback

To rollback migrations, use Supabase CLI:

```bash
supabase db reset
```

This will drop and recreate the local database, then re-apply all migrations.
