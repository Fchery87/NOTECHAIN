# NoteChain Deployment Guide

## Prerequisites

- Node.js 20+ or Bun 1.0+
- Git
- Access to deployment environment (Vercel/Railway/AWS)
- Supabase account
- Stripe account (for payments)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/notechain/notechain.git
cd notechain
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Variables

Create `.env` files:

**Root `.env`:**

```env
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Encryption
ENCRYPTION_KEY_SECRET=...

# AI Services
OPENAI_API_KEY=...

# Stripe (Pro features)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Analytics (privacy-respecting)
POSTHOG_KEY=...

# Error Tracking
SENTRY_DSN=...
```

### 4. Database Setup

```bash
# Run migrations
cd supabase
supabase migration up

# Generate types
supabase gen types typescript --project-id your-project-id > types.ts
```

## Deployment Options

### Option A: Vercel (Recommended for Web)

1. Connect GitHub repo to Vercel
2. Configure build settings:
   - Build Command: `bun run build`
   - Output Directory: `apps/web/.next`
3. Add environment variables in Vercel dashboard
4. Deploy!

### Option B: Self-Hosted with Docker

```dockerfile
# Dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
```

Build and run:

```bash
docker build -t notechain .
docker run -p 3000:3000 --env-file .env notechain
```

### Option C: Railway/Render

1. Connect repository
2. Set environment variables
3. Deploy automatically on push

## Production Checklist

### Security

- [ ] SSL/TLS enabled
- [ ] Environment variables secured
- [ ] API keys rotated
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Security headers set

### Performance

- [ ] CDN configured for static assets
- [ ] Database indexes created
- [ ] Connection pooling enabled
- [ ] Compression enabled
- [ ] Caching strategy implemented

### Monitoring

- [ ] Error tracking (Sentry)
- [ ] Analytics (PostHog/Plausible)
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Log aggregation

### Backup

- [ ] Automated database backups
- [ ] Backup encryption
- [ ] Backup testing
- [ ] Disaster recovery plan

## SSL Configuration

### Let's Encrypt (Self-hosted)

```bash
# Using Certbot
sudo certbot --nginx -d notechain.app -d www.notechain.app
```

### Cloudflare

1. Add site to Cloudflare
2. Enable SSL/TLS encryption mode: Full (strict)
3. Enable automatic HTTPS rewrites

## Domain Configuration

### DNS Records

```
Type  Name              Value                    TTL
A     @                 your-server-ip           3600
A     www               your-server-ip           3600
CNAME api               api-server.com           3600
TXT   _vercel           vercel-verification      3600
```

### Vercel Domains

1. Add domain in Vercel dashboard
2. Update nameservers to Vercel
3. Or add DNS records as specified

## Database Backups

### Automated Backups (Supabase)

```bash
# Enable point-in-time recovery
supabase start --pit-recovery

# Manual backup
supabase db dump -f backup.sql
```

### Self-Managed Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql
# Upload to S3 or storage
aws s3 cp backup_$DATE.sql.gz s3://notechain-backups/
```

Add to crontab:

```bash
0 2 * * * /path/to/backup.sh  # Daily at 2 AM
```

## Rollback Procedures

### Quick Rollback (Vercel)

```bash
# Rollback to previous deployment
vercel --prod --rollback
```

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup_20240208.sql

# Or use Supabase UI to restore point-in-time
```

### Code Rollback

```bash
# Revert to last known good commit
git revert HEAD
# Or
git reset --hard <commit-hash>
git push --force
```

## Monitoring Setup

### Sentry Error Tracking

```typescript
// apps/web/src/instrumentation.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Uptime Monitoring (UptimeRobot)

1. Create account at uptimerobot.com
2. Add monitors:
   - https://notechain.app (HTTPS)
   - https://api.notechain.app/health (API)
3. Configure alerts (email, Slack)

### Health Check Endpoint

```typescript
// apps/web/src/app/health/route.ts
export async function GET() {
  // Check database
  // Check external services
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  });
}
```

## Scaling Considerations

### Horizontal Scaling

- Use stateless architecture
- Store sessions in database/Redis
- Use CDN for static assets

### Database Scaling

- Read replicas for queries
- Connection pooling (PgBouncer)
- Sharding for multi-tenant setup

### Cost Optimization

- Use edge functions where possible
- Optimize bundle size
- Implement intelligent caching

## Troubleshooting

### Common Issues

**Build fails:**

```bash
# Clear cache
rm -rf node_modules .next
bun install
bun run build
```

**Database connection errors:**

- Check DATABASE_URL format
- Verify firewall rules
- Check connection limits

**Environment variables not loading:**

- Verify .env file location
- Check variable names match code
- Restart dev server

### Support Resources

- Deployment logs: Vercel dashboard / Railway logs
- Database logs: Supabase dashboard
- Error tracking: Sentry dashboard
- Performance: Web Vitals / Lighthouse

## Post-Deployment

### Verification Checklist

- [ ] Homepage loads correctly
- [ ] Authentication works
- [ ] Notes can be created/edited
- [ ] Encryption is working
- [ ] Sync is functioning
- [ ] AI features respond
- [ ] Payments process (Pro)
- [ ] Emails send (if applicable)
- [ ] Backups are running
- [ ] Monitoring is active

### Launch Communication

1. Update status page
2. Send announcement email
3. Post on social media
4. Update documentation
5. Monitor for issues

## Emergency Contacts

- Infrastructure: [ops team]
- Security: [security team]
- Database: [dba team]

---

**Remember: Test your rollback procedures before you need them!**
