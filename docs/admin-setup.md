# Admin Dashboard Setup Guide

This guide explains how to set up and use the admin dashboard for NoteChain.

## Overview

The admin dashboard provides comprehensive control over:

- User management and roles
- Team administration
- System analytics and metrics
- Audit logs and security monitoring
- Support ticket management
- System configuration

## Files Created

### Core Components

- `apps/web/src/lib/supabase/UserProvider.tsx` - Updated with role support
- `apps/web/src/components/AdminProtectedLayout.tsx` - Admin access protection
- `apps/web/src/components/AppHeader.tsx` - Added admin navigation link
- `apps/web/src/app/admin/page.tsx` - Full admin dashboard interface

### Database

- `apps/web/supabase/migrations/20240214000000_add_user_roles.sql` - Role schema migration

## User Roles

Three roles are available:

1. **user** - Regular user with standard access
2. **moderator** - Elevated permissions (can view all content, manage reports)
3. **admin** - Full system access including admin dashboard

## Setup Instructions

### Step 1: Apply Database Migration

Run the migration to add role support to your database:

**Option A: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** → **New Query**
3. Copy and paste the contents of `apps/web/supabase/migrations/20240214000000_add_user_roles.sql`
4. Click **Run**

**Option B: Using Supabase CLI**

```bash
supabase migration up
```

### Step 2: Make Yourself an Admin

Choose one of these methods:

#### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** → **New Query**
3. Run this SQL (replace with your email):

```sql
UPDATE profiles
SET role = 'admin'
WHERE id IN (
    SELECT id
    FROM auth.users
    WHERE email = 'your-email@example.com'
);
```

#### Method 2: Make First User Admin

```sql
UPDATE profiles SET role = 'admin' LIMIT 1;
```

#### Method 3: By User ID

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'your-user-uuid-here';
```

### Step 3: Verify Admin Access

1. **Refresh your browser** - The user context needs to reload
2. **Check the user menu** - Click your avatar in the top right
3. **Look for "Admin Dashboard"** - Should appear in amber/orange color
4. **Click it** - Takes you to `/admin`

## Admin Dashboard Sections

### 1. Overview

- Real-time system stats
- Total users, teams, storage usage
- Open support tickets
- Recent activity feed
- Quick action buttons

### 2. Users

- View all user accounts
- Filter by role, status, plan
- Edit user details
- Suspend/activate accounts
- View user statistics

### 3. Teams

- Manage all teams
- View team details and members
- Edit team settings
- Monitor team storage usage

### 4. Analytics

- Daily/monthly active users
- Notes created statistics
- Sync operation metrics
- Revenue overview (placeholder)
- Plan distribution charts
- Feature usage analytics

### 5. Audit Logs

- Security event tracking
- Failed login attempts
- User management actions
- Severity levels (info, warning, critical)
- Timestamp filtering

### 6. Support

- Support ticket management
- Priority levels (low, medium, high, urgent)
- Status tracking (open, in_progress, resolved, closed)
- Category-based organization

### 7. Settings

- Maintenance mode toggle
- New user registration control
- Email notification settings
- Two-factor auth requirements
- Cache clearing
- System reset (danger zone)

## Security Features

### Protected Access

- Only authenticated admins can access `/admin`
- Non-admins are redirected to dashboard
- Non-logged-in users are redirected to login
- Loading states during permission checks

### RLS Policies

The migration creates Row Level Security policies:

- Users can only view their own role
- Admins can view all user roles
- Only admins can update roles
- All role checks are server-side verified

## Troubleshooting

### Admin link doesn't appear

1. Refresh the page completely
2. Check browser console for errors
3. Verify the migration ran successfully
4. Confirm your email matches the one in the database

### Cannot access admin page

1. Check that you're logged in
2. Verify your role is 'admin' in the profiles table
3. Check browser console for auth errors
4. Ensure the UserProvider is wrapping your app

### Database errors

1. Make sure the migration was applied
2. Check that the profiles table exists
3. Verify the user_role enum was created
4. Look for RLS policy conflicts

## Making Other Users Admins

You can promote other users to admin from the admin dashboard:

1. Go to **Users** section
2. Find the user you want to promote
3. Click the edit icon
4. Change their role to 'admin'
5. Save changes

Or use SQL:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'newadmin@example.com'
);
```

## API Usage

The admin dashboard uses these hooks:

```typescript
import { useUser } from '@/lib/supabase/UserProvider';

function MyComponent() {
  const { user, isAdmin, isModerator, role } = useUser();

  if (isAdmin) {
    // Show admin-only features
  }
}
```

## Next Steps

After setup, consider:

1. **Create additional admins** for team management
2. **Set up moderators** for content moderation
3. **Review audit logs** regularly for security
4. **Monitor analytics** for system health
5. **Configure support workflows** for user issues

## Support

For issues with admin access:

1. Check the browser console for errors
2. Verify database schema matches migration
3. Ensure Supabase connection is working
4. Review RLS policies are correct

---

**Note**: Always keep admin credentials secure and use the principle of least privilege when assigning roles.
