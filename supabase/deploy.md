# NoteChain Supabase Deployment Guide

**Version:** 1.0
**Last Updated:** 2025-01-18

---

## Overview

This guide covers deploying NoteChain to production using Supabase infrastructure. Supabase provides managed PostgreSQL, authentication, real-time sync, object storage, and edge functions, eliminating the need for custom infrastructure management.

**Target:** Production deployment with 99.9% uptime SLA

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Migration](#database-migration)
4. [Row Level Security Configuration](#row-level-security-configuration)
5. [Storage Configuration](#storage-configuration)
6. [Edge Functions Deployment](#edge-functions-deployment)
7. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
8. [Environment Management](#environment-management)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Backup & Disaster Recovery](#backup--disaster-recovery)
11. [Security Hardening](#security-hardening)
12. [Performance Optimization](#performance-optimization)

---

## Prerequisites

### Required Accounts & Services

- **Supabase Account** - https://supabase.com (Pro plan recommended for production)
- **GitHub Repository** - For CI/CD pipeline
- **Stripe Account** - For billing integration (Pro tier subscriptions)
- **Domain Name** - For custom domain configuration (optional but recommended)

### Required Tools

```bash
# Install Supabase CLI
bun install -g supabase

# Verify installation
supabase --version  # Should be >= 1.100.0

# Login to Supabase
supabase login
```

### Required Permissions

- Supabase project owner or admin access
- GitHub repository write access (for GitHub Actions)
- Stripe account with API keys
- DNS management access (if using custom domain)

---

## Supabase Project Setup

### 1. Create Supabase Project

1. Navigate to https://supabase.com/dashboard
2. Click **New Project**
3. Configure:
   - **Name:** `notecain-production`
   - **Database Password:** Generate strong password (store in secure password manager)
   - **Region:** Choose closest to user base:
     - US East: `us-east-1`
     - EU West: `eu-west-1`
     - AP Southeast: `ap-southeast-1`
4. Click **Create new project**
5. Wait for project to be provisioned (2-5 minutes)

### 2. Get Project Credentials

After project creation:

```bash
# Link your local project to Supabase project
supabase link --project-ref <your-project-ref>

# Get project URL and anon key
supabase status
```

**Save these values securely:**

```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # CRITICAL: Only use on server-side
```

**⚠️ SECURITY WARNING:** Never commit `SUPABASE_SERVICE_ROLE_KEY` to repository. Use GitHub Secrets for CI/CD.

### 3. Enable Required Features

In Supabase Dashboard → **Project Settings**:

#### Database

- **PostgreSQL Version:** Ensure 15.x is selected
- **Connection Pooler:** Enabled (default: 15 connections)
- **PGBouncer:** Enabled for connection management

#### Authentication

- **Email Auth:** Enabled
- **Phone Auth:** Disabled (optional for MVP)
- **Social Providers:** Enable Google, Apple
- **JWT Expiry:** 1 hour (for access tokens)
- **Refresh Token Rotation:** Enabled

#### Realtime

- **Postgres Changes:** Enabled (for sync)
- **Broadcast:** Enabled (for real-time notifications)
- **Presence:** Enabled (for online status)

#### Storage

- **Storage API:** Enabled
- **Image Transformation:** Enabled (for PDF thumbnails)
- **CDN:** Enabled (default)

#### Edge Functions

- **Edge Runtime:** Enabled (Deno runtime)

---

## Database Migration

### 1. Push Local Schema to Production

```bash
# Ensure you have database migrations ready
ls supabase/migrations/
# Should see: 001_initial_schema.sql

# Push migrations to production
supabase db push

# Verify migration success
supabase db remote commit
```

### 2. Generate TypeScript Types

```bash
# Generate types from production database
supabase gen types typescript --project-id <your-project-id> \
  --schema public > packages/data-models/src/supabase-types.ts
```

### 3. Verify Schema Deployment

Access Supabase SQL Editor:

1. Go to Dashboard → **SQL Editor**
2. Run verification query:

```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected output: 11 tables
-- profiles, devices, encrypted_blobs, sync_metadata, subscriptions,
-- notes, notebooks, todos, projects, pdf_documents, pdf_annotations

-- Check Row Level Security policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Row Level Security Configuration

### Verify RLS Policies

All tables should have RLS policies. Verify via SQL Editor:

```sql
-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: All tables have rowsecurity = true
```

### Test RLS Policies

Create test user in Supabase Dashboard → **Authentication**:

1. Create test user: `test@notechain.tech`
2. Get test user JWT token
3. Run test query with JWT token in Postman/Insomnia:

```bash
# Test: User should only see their own data
curl -X GET 'https://<project-ref>.supabase.co/rest/v1/notes' \
  -H 'Authorization: Bearer <test-user-jwt>' \
  -H 'apikey: <anon-key>'

# Test: User should not see another user's data
# Create second user and verify data isolation
```

### Security Audit Checklist

- ✅ All tables have `ENABLE ROW LEVEL SECURITY`
- ✅ Users can only access `user_id IN (SELECT id FROM profiles WHERE id = auth.uid())`
- ✅ No policies grant access to all rows (`USING (true)`)
- ✅ Service role key is not exposed in client code
- ✅ Anon key has limited permissions (only auth and public endpoints)

---

## Storage Configuration

### 1. Create Storage Buckets

In Supabase Dashboard → **Storage**:

#### Bucket 1: `encrypted-blobs`

```yaml
Bucket: encrypted-blobs
Public: false
File Size Limit: 52428800 (50MB)
Allowed MIME Types: application/octet-stream, application/pdf
```

#### Bucket 2: `pdf-thumbnails`

```yaml
Bucket: pdf-thumbnails
Public: false
File Size Limit: 1048576 (1MB)
Allowed MIME Types: image/jpeg, image/png
Transformations: enabled
```

#### Bucket 3: `profile-avatars`

```yaml
Bucket: profile-avatars
Public: true # Avatars can be public
File Size Limit: 524288 (512KB)
Allowed MIME Types: image/jpeg, image/png
```

### 2. Create Storage Policies

Navigate to Dashboard → **Storage** → **Policies**:

#### Policy 1: Users can upload to encrypted-blobs

```sql
CREATE POLICY "Users can upload encrypted blobs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'encrypted-blobs'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Users can download their own blobs

```sql
CREATE POLICY "Users can download own blobs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'encrypted-blobs'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Users can delete their own blobs

```sql
CREATE POLICY "Users can delete own blobs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'encrypted-blobs'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Enable CDN

In Dashboard → **Storage** → **Settings**:

- **Image CDN:** Enabled (for thumbnails)
- **Origin:** Custom domain (optional)
  - Configure CNAME in DNS: `cdn.notechain.tech`
  - Add SSL certificate via Supabase Dashboard

---

## Edge Functions Deployment

### 1. Stripe Webhook Handler

Create `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

serve(async req => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle subscription events
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    await supabase.from('subscriptions').upsert({
      user_id: subscription.metadata.user_id,
      account_tier: 'pro',
      subscription_status: 'active',
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      device_limit: 5,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await supabase
      .from('subscriptions')
      .update({
        subscription_status: 'canceled',
        device_limit: 1, // Revert to free tier limits
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

### 2. Push Push Notification Function

Create `supabase/functions/push-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface PushNotification {
  user_id: string;
  title: string;
  body: string;
  type: 'sync_complete' | 'new_device' | 'subscription_expired';
}

serve(async req => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { user_id, title, body, type }: PushNotification = await req.json();

  // Send push notification via Firebase/APNs
  // Implementation depends on push notification provider
  // This is a placeholder for actual integration

  return new Response(JSON.stringify({ sent: true }), { status: 200 });
});
```

### 3. Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy

# Deploy specific function
supabase functions deploy stripe-webhook

# View deployed functions
supabase functions list
```

### 4. Set Function Secrets

In Dashboard → **Edge Functions** → **Settings**:

```bash
# Add secrets via CLI
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set PUSH_NOTIFICATION_API_KEY=api_key_xxx
```

**⚠️ SECURITY:** Never commit edge function secrets. Use Supabase Dashboard secrets management.

---

## CI/CD Pipeline Setup

### 1. GitHub Actions Workflow

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Supabase Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: '1.0.0'

      - name: Install dependencies
        run: bun install

      - name: Install Supabase CLI
        run: bun install -g supabase

      - name: Link to Supabase project
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}

      - name: Push database migrations
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: supabase db push

      - name: Generate TypeScript types
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: supabase gen types typescript --project-id ${{ secrets.SUPABASE_PROJECT_ID }} > packages/data-models/src/supabase-types.ts

      - name: Deploy edge functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: supabase functions deploy

      - name: Run tests
        run: bun test

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deploy to Supabase production failed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 2. Configure GitHub Secrets

In GitHub Repository → **Settings** → **Secrets and variables**:

```bash
# Add required secrets
SUPABASE_ACCESS_TOKEN         # From https://supabase.com/dashboard/account/tokens
SUPABASE_PROJECT_REF          # From Supabase project URL
SUPABASE_PROJECT_ID           # From Supabase Dashboard → Project Settings → API
STRIPE_SECRET_KEY            # Live Stripe secret key
STRIPE_WEBHOOK_SECRET        # From Stripe Dashboard → Webhooks
SLACK_WEBHOOK_URL            # For deployment notifications (optional)
```

### 3. Deploy Protection

Add branch protection rules:

1. Go to GitHub → **Settings** → **Branches**
2. Edit `main` branch:
   - **Require pull request before merging**
   - **Require status checks to pass before merging**:
     - Deploy to Supabase Production
     - Run tests
   - **Require conversation resolution before merging**

---

## Environment Management

### Environment Files

#### Local Development (`.env.local`)

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENCRYPTION_ALGORITHM=AES-256-GCM
KEY_DERIVATION_ITERATIONS=310000
```

#### Staging (`.env.staging`)

```bash
SUPABASE_URL=https://notecain-staging.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_PUBLIC_KEY=pk_test_xxx
```

#### Production (`.env.production`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://notecain-production.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_PUBLIC_KEY=pk_live_xxx
```

### Environment-Specific Configs

Update package.json scripts:

```json
{
  "scripts": {
    "dev": "bun run --filter '*:dev'",
    "dev:staging": "bun run --filter '*:dev:staging'",
    "build": "bun run --filter '*:build'",
    "build:staging": "bun run --filter '*:build:staging'",
    "deploy:staging": "bun run deploy:staging",
    "deploy:production": "bun run deploy:production"
  }
}
```

---

## Monitoring & Alerting

### Supabase Built-in Monitoring

In Dashboard → **Logs**:

#### Database Logs

- **Query Performance:** Monitor slow queries (>500ms)
- **Connection Pool:** Track pool utilization
- **Error Rates:** Monitor database error percentage

#### Auth Logs

- **Login Failures:** Track failed authentication attempts
- **Signup Rates:** Monitor new user registration
- **Token Refresh:** Track token refresh frequency

#### Storage Logs

- **Upload Failures:** Track failed file uploads
- **Bandwidth Usage:** Monitor storage egress
- **Error Codes:** Track 4xx/5xx errors

#### Realtime Logs

- **WebSocket Connections:** Monitor active connections
- **Message Throughput:** Track real-time message volume
- **Disconnection Rates:** Monitor unexpected disconnects

### Custom Monitoring with Supabase Logs

Create `packages/monitoring/src/index.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export class MonitoringService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async logError(error: Error, context?: Record<string, unknown>) {
    // Log error to Supabase for debugging
    await this.supabase.from('error_logs').insert({
      error_message: error.message,
      error_stack: error.stack,
      context: JSON.stringify(context),
      user_id: this.getUserId(),
      created_at: new Date().toISOString(),
    });
  }

  async logMetric(metric: string, value: number) {
    await this.supabase.from('metrics').insert({
      metric_name: metric,
      metric_value: value,
      user_id: this.getUserId(),
      created_at: new Date().toISOString(),
    });
  }

  private getUserId(): string | null {
    // Get user ID from Supabase Auth
    const {
      data: { user },
    } = this.supabase.auth.getUser();
    return user?.id || null;
  }
}
```

### Alert Thresholds

Configure alert thresholds in Dashboard → **Settings**:

| Metric               | Warning Threshold | Critical Threshold | Action                               |
| -------------------- | ----------------- | ------------------ | ------------------------------------ |
| Error Rate           | > 5%              | > 10%              | Investigate logs, rollback if needed |
| Database CPU         | > 70%             | > 90%              | Scale database, optimize queries     |
| Storage Bandwidth    | > 10GB/day        | > 20GB/day         | Check for abuse, optimize downloads  |
| Auth Failures        | > 100/hour        | > 500/hour         | Check for brute force attacks        |
| Realtime Disconnects | > 10%/hour        | > 20%/hour         | Check WebSocket stability            |

---

## Backup & Disaster Recovery

### Supabase Automatic Backups

**Free Tier:**

- Daily backups retained for 7 days
- Point-in-time recovery: 24-hour window

**Pro Tier:**

- Daily backups retained for 30 days
- Point-in-time recovery: 30-day window
- Replication: Optional (add-on)

### Manual Backup Strategy

```bash
# Create manual backup via Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# List all backups
supabase db backups

# Restore from backup
supabase db restore --backup-id <backup-id>
```

### Disaster Recovery Procedure

#### Scenario 1: Database Corruption

1. **Stop application:**

   ```bash
   # Deploy maintenance page to web
   # Disable API via Supabase Dashboard
   ```

2. **Restore database:**

   ```bash
   supabase db restore --backup-id <latest-healthy-backup>
   ```

3. **Verify data integrity:**

   ```sql
   -- Check row counts match expected
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM encrypted_blobs;
   SELECT COUNT(*) FROM notes;
   ```

4. **Resume application:**
   ```bash
   # Remove maintenance page
   # Enable API via Supabase Dashboard
   ```

#### Scenario 2: Storage Failure

1. **Verify bucket health:**

   ```bash
   # Check bucket status in Dashboard
   ```

2. **Replicate to new bucket:**

   ```bash
   # Create new bucket with same policies
   # Run replication script to migrate data
   ```

3. **Update application config:**
   ```bash
   # Update SUPABASE_STORAGE_BUCKET in production .env
   ```

### RTO/RPO Targets

| Metric                         | Target  | Notes                       |
| ------------------------------ | ------- | --------------------------- |
| Recovery Time Objective (RTO)  | 4 hours | Maximum acceptable downtime |
| Recovery Point Objective (RPO) | 1 hour  | Maximum data loss           |

---

## Security Hardening

### 1. Network Security

#### SSL/TLS Enforcement

All Supabase endpoints automatically use TLS 1.3. Verify:

```bash
# Check SSL certificate
curl -vI https://<project-ref>.supabase.co 2>&1 | grep "TLS"

# Expected output: TLS 1.3
```

#### Custom Domain SSL

If using custom domain (e.g., `api.notechain.tech`):

1. Configure CNAME in DNS:

   ```
   api.notechain.tech CNAME <project-ref>.supabase.co
   ```

2. Add custom domain in Supabase Dashboard → **Settings** → **Custom Domains**

3. Verify SSL certificate auto-generated by Supabase

### 2. Access Control

#### API Rate Limiting

Configure in Dashboard → **Settings** → **API**:

```yaml
Rate Limiting:
  - Request Rate: 1000 requests/hour per user
  - Burst Rate: 100 requests/minute
  - Exceeded: Return 429 status with Retry-After header
```

#### IP Whitelisting (Optional)

For sensitive operations (e.g., admin functions):

```yaml
Allowed IPs:
  - Admin VPN IP: 203.0.113.0/24
  - Office IP: 198.51.100.0/24
```

### 3. Secrets Management

#### Never Commit Secrets

Add to `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.staging
.env.production

# Supabase
.supabase/

# Service keys
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
```

#### Rotate Keys Regularly

- **Supabase Keys:** Rotate every 90 days
- **Stripe Keys:** Rotate every 180 days
- **Database Password:** Rotate every 180 days

Key rotation process:

1. Generate new key in provider dashboard
2. Update GitHub Secrets
3. Deploy new configuration
4. Monitor for errors
5. Revoke old key after 7 days

### 4. Security Headers

Configure custom domain headers in Supabase Dashboard:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Performance Optimization

### 1. Database Optimization

#### Connection Pooling

Configure in Dashboard → **Database** → **Connection Pooling**:

```yaml
Connection Pooling:
  - Max Connections: 15 (default)
  - Mode: Transaction pooling
  - Pool Timeout: 10 seconds
```

#### Index Optimization

All critical queries already indexed in schema (see `001_initial_schema.sql`):

```sql
-- Verify indexes are being used
EXPLAIN ANALYZE SELECT * FROM notes WHERE user_id = 'xxx';

-- Check query plan:
-- Expected: "Index Scan using idx_notes_user"
```

#### Query Optimization

Use Supabase Query Performance Dashboard to identify slow queries:

1. Go to Dashboard → **Database** → **Query Performance**
2. Review queries with duration > 100ms
3. Add indexes or rewrite queries as needed

### 2. Edge Function Optimization

#### Function Caching

Enable function response caching:

```typescript
// Add cache headers to edge function responses
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    'Cache-Control': 'public, max-age=300', // 5 minute cache
    'Content-Type': 'application/json',
  },
});
```

#### Function Cold Starts

Monitor cold starts:

1. Go to Dashboard → **Edge Functions** → **Logs**
2. Identify functions with high cold start frequency
3. Optimize by:
   - Reducing imports
   - Using environment variables instead of config files
   - Implementing simple keep-alive strategy

### 3. CDN Optimization

#### Image Transformation

Enable in Dashboard → **Storage** → **Settings**:

```yaml
Image Transformation:
  - Enabled: true
  - Quality: 85
  - Format: webp
  - Sizes: [200, 400, 800, 1200]
```

#### Cache-Control Headers

Set on storage objects:

```bash
# Upload with cache headers
curl -X PUT 'https://<project-ref>.supabase.co/storage/v1/object/encrypted-blobs/user-123/blob-456' \
  -H 'Authorization: Bearer <jwt>' \
  -H 'Cache-Control: private, max-age=3600' \
  --data-binary @encrypted-file
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Database schema tested on staging
- [ ] All RLS policies verified
- [ ] Storage policies configured
- [ ] Edge functions tested locally
- [ ] TypeScript types generated
- [ ] Environment variables documented
- [ ] GitHub Secrets configured
- [ ] Monitoring alerts set up
- [ ] Backups verified
- [ ] Security headers configured

### Deployment Steps

1. **Run pre-deployment tests:**

   ```bash
   bun test
   bun run typecheck
   ```

2. **Push to main branch:**

   ```bash
   git checkout main
   git pull origin main
   git merge feature-branch
   git push origin main
   ```

3. **Monitor CI/CD pipeline:**
   - Check GitHub Actions for failures
   - Review deployment logs
   - Verify database migrations applied

4. **Smoke test production:**

   ```bash
   # Test authentication
   curl -X POST 'https://api.notechain.tech/auth/v1/login' \
     -d '{"email_hash":"xxx","auth_token_hash":"xxx"}'

   # Test note creation
   curl -X POST 'https://api.notechain.tech/notes/v1' \
     -H 'Authorization: Bearer <jwt>' \
     -d '{"encrypted_blob_id":"xxx","title_hash":"xxx"}'
   ```

5. **Monitor for 1 hour:**
   - Check error rates in Dashboard
   - Verify sync is working
   - Monitor WebSocket connections

### Post-Deployment

- [ ] Verify all services are healthy
- [ ] Monitor logs for errors
- [ ] Confirm backup is running
- [ ] Check performance metrics
- [ ] Notify team of successful deployment

---

## Troubleshooting

### Issue 1: Database Migration Fails

**Symptoms:** `supabase db push` fails with error

**Solutions:**

```bash
# 1. Check for syntax errors in migration
supabase db diff

# 2. Reset local migration state
supabase db reset

# 3. Manually run migration
supabase db execute --file supabase/migrations/001_initial_schema.sql
```

### Issue 2: RLS Policy Blocking Access

**Symptoms:** Users cannot access their own data (403 Forbidden)

**Solutions:**

```sql
-- 1. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 2. Check policy exists
SELECT * FROM pg_policies
WHERE tablename = 'notes';

-- 3. Test policy as user
SET ROLE authenticated;
SELECT * FROM notes WHERE user_id = 'test-user-id';
```

### Issue 3: Edge Function Failing

**Symptoms:** Edge function returns 500 error

**Solutions:**

```bash
# 1. Check function logs
supabase functions logs stripe-webhook

# 2. Test locally
supabase functions serve stripe-webhook

# 3. Check environment variables
supabase secrets list
```

### Issue 4: Storage Upload Fails

**Symptoms:** 413 Payload Too Large

**Solutions:**

- Verify file size < 50MB limit
- Check Content-Type header
- Verify storage policy allows upload

---

## Cost Estimation

### Supabase Pro Plan

| Resource       | Included         | Overage Cost      |
| -------------- | ---------------- | ----------------- |
| Database       | 8GB              | $0.125/GB         |
| Auth           | 50,000 MAU       | $0.015/MAU        |
| Storage        | 100GB            | $0.021/GB         |
| Bandwidth      | 250GB            | $0.021/GB         |
| Edge Functions | 500K invocations | $2/1M invocations |

**Estimated Monthly Cost:**

- 10,000 users: $25-50/month
- 50,000 users: $75-150/month
- 100,000 users: $150-300/month

### Additional Costs

- **Custom Domain:** Free (via Supabase)
- **SSL Certificates:** Free (auto-generated)
- **Stripe:** 2.9% + $0.30/transaction
- **Push Notifications:** Varies by provider

---

## Support & Resources

### Supabase Documentation

- [Official Docs](https://supabase.com/docs)
- [CLI Reference](https://supabase.com/docs/guides/cli)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Edge Functions](https://supabase.com/docs/guides/functions)

### NoteChain Documentation

- [Architecture Decisions](../adr/)
- [API Specification](../api/openapi-spec.yaml)
- [Project README](../../README.md)

### Emergency Contacts

- **Supabase Support:** support@supabase.com
- **On-Call Engineer:** +1-XXX-XXX-XXXX (configure for production)
- **Incident Response:** Create PagerDuty or OpsGenie alerting

---

## Appendix: Configuration Templates

### GitHub Actions Workflow Template

See **[CI/CD Pipeline Setup](#cicd-pipeline-setup)** section for complete `.github/workflows/deploy-production.yml`.

### Environment Variable Template

```bash
# apps/mobile/.env.production.template
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
ENCRYPTION_ALGORITHM=AES-256-GCM
KEY_DERIVATION_ITERATIONS=310000
BIOMETRIC_UNLOCK_ENABLED=true
GOOGLE_OAUTH_CLIENT_ID_WEB=<google-client-id>
STRIPE_PUBLIC_KEY=pk_live_xxx
```

---

**Last Updated:** 2025-01-18
**Document Version:** 1.0
**Maintained by:** NoteChain Development Team
