# Phase 2: Database Integration Setup

## Database Schema

The following migrations have been created:

1. **001_initial_schema.sql** - Core tables (profiles, devices, encrypted_blobs)
2. **002_storage_buckets.sql** - File storage configuration
3. **003_auth_triggers.sql** - Automatic profile creation on signup

## Applying Migrations

Since Docker isn't available in this environment, you need to apply migrations via Supabase Dashboard:

### Option 1: SQL Editor (Recommended)

1. Go to: https://app.supabase.com/project/kryeeloydyfnqkesvdnp/sql/new
2. Copy contents of `supabase/migrations/003_auth_triggers.sql`
3. Paste into SQL Editor
4. Click **Run**

### Option 2: Supabase CLI (if you have Docker)

```bash
supabase link --project-ref kryeeloydyfnqkesvdnp
supabase db push
```

## What Gets Created

### Tables

- `profiles` - User profile data with RLS
- `devices` - Device management for E2E sync
- `encrypted_blobs` - Encrypted note/task data

### Triggers

- `on_auth_user_created` - Auto-creates profile on signup
- `on_auth_user_deleted` - Cleans up user data on deletion
- `update_profiles_updated_at` - Auto-updates timestamps

### RLS Policies

All tables have Row Level Security enabled:

- Users can only access their own data
- Policies enforced at database level

## Testing

After applying migrations:

1. Sign up a new user at `/auth/signup`
2. Check Supabase Dashboard → Table Editor → profiles
3. Should see a new row with the user's ID
4. Sign in at `/auth/login`
5. Visit `/dashboard` - should load successfully

## Files Created/Modified

- `supabase/migrations/003_auth_triggers.sql` ✅
- `src/lib/supabase/db.ts` - Database helpers ✅
- `src/lib/supabase/UserProvider.tsx` - User context ✅
- `src/app/layout.tsx` - Added UserProvider ✅
- `src/app/auth/callback/route.ts` - Handles auth redirect ✅

## Next Steps

1. Apply the migration via SQL Editor
2. Test signup/login flow
3. Continue to Phase 3: Sync Layer (CRDT implementation)
