# Google OAuth Setup Guide

This guide will help you configure Google OAuth for your NoteChain app.

## Project Details

- **Project ID**: kryeeloydyfnqkesvdnp
- **Project URL**: https://kryeeloydyfnqkesvdnp.supabase.co
- **Site URL**: http://localhost:3000 (for local dev)

---

## Step 1: Configure Redirect URLs

1. Go to: https://app.supabase.com/project/kryeeloydyfnqkesvdnp/auth/url-configuration
2. Add these redirect URLs:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```
3. Set **Site URL** to: `http://localhost:3000`

---

## Step 2: Create Google OAuth Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: NoteChain
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Create OAuth client ID:
   - Application type: Web application
   - Name: NoteChain Web
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     https://your-production-domain.com
     ```
   - Authorized redirect URIs:
     ```
     https://kryeeloydyfnqkesvdnp.supabase.co/auth/v1/callback
     ```
5. Click **Create**
6. Copy **Client ID** and **Client Secret**

---

## Step 3: Enable Google OAuth in Supabase

1. Go to: https://app.supabase.com/project/kryeeloydyfnqkesvdnp/auth/providers
2. Find **Google** provider
3. Toggle **Enabled**
4. Paste:
   - Client ID (from Google Console)
   - Client Secret (from Google Console)
5. Click **Save**

---

## Step 4: Test Google OAuth

1. Start your app:

   ```bash
   cd apps/web && bun run dev
   ```

2. Visit: http://localhost:3000/auth/login

3. Click **"Continue with Google"** button

4. You should be redirected to Google sign-in, then back to your app

5. Check Supabase Dashboard → Table Editor → **profiles**
   - Should see a new row with your user

---

## Troubleshooting

### "redirect_uri_mismatch" Error

- Make sure the redirect URI in Google Console is exactly:
  ```
  https://kryeeloydyfnqkesvdnp.supabase.co/auth/v1/callback
  ```

### "Provider is not enabled" Error

- Go to Supabase Auth Providers page
- Ensure Google is toggled **ON**
- Ensure Client ID and Secret are saved

### User not redirected back to app

- Check Site URL in Supabase URL Configuration
- Should be: `http://localhost:3000`

---

## Production Setup

When deploying to production:

1. Add production URLs to Google OAuth app:

   ```
   https://your-domain.com
   ```

2. Add production redirect URI:

   ```
   https://your-domain.com/auth/callback
   https://kryeeloydyfnqkesvdnp.supabase.co/auth/v1/callback
   ```

3. Update Supabase Site URL:
   - Go to URL Configuration
   - Change to: `https://your-domain.com`

---

## Quick Reference

| Service        | URL                                                                  |
| -------------- | -------------------------------------------------------------------- |
| Google Console | https://console.cloud.google.com/apis/credentials                    |
| Supabase Auth  | https://app.supabase.com/project/kryeeloydyfnqkesvdnp/auth/providers |
| Login Page     | http://localhost:3000/auth/login                                     |
| Callback URL   | https://kryeeloydyfnqkesvdnp.supabase.co/auth/v1/callback            |

---

**Once configured, users can sign in with Google!** 🎉
