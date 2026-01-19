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

| File                     | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `001_initial_schema.sql` | Initial schema with users, notes, todos, notebooks, sync tables |

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
