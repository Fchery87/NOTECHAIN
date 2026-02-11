# NoteChain Deployment Guide

This guide covers deploying NoteChain to production environments.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Options](#deployment-options)
- [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
- [AWS Deployment](#aws-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`bun run test`)
- [ ] No linting errors (`bun run lint`)
- [ ] TypeScript compilation successful (`bun run typecheck`)
- [ ] Production build successful (`bun run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Backup strategy in place

## Deployment Options

### Recommended Stack

- **Hosting**: Vercel (Next.js apps)
- **Database**: Neon PostgreSQL or Supabase
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics + Sentry

### Alternative Stacks

- AWS (EC2/ECS + RDS + S3)
- DigitalOcean (App Platform + Managed PostgreSQL)
- Railway (simplified deployment)

## Vercel Deployment (Recommended)

### Prerequisites

- Vercel account
- GitHub repository connected
- Domain name (optional)

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Configure Project

Create `vercel.json` in the project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/marketing/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/marketing/(.*)",
      "dest": "apps/marketing/$1"
    },
    {
      "src": "/(.*)",
      "dest": "apps/web/$1"
    }
  ]
}
```

### Step 4: Set Environment Variables

In Vercel Dashboard > Project Settings > Environment Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# Neon Database
NEXT_PUBLIC_NEON_DATABASE_URL=postgresql://xxx
NEON_PRIVATE_KEY=xxx

# OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx

# JWT
NEXT_PUBLIC_JWT_SECRET=xxx

# Node Environment
NODE_ENV=production
```

### Step 5: Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Step 6: Configure Custom Domain (Optional)

In Vercel Dashboard:

1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed

## AWS Deployment

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Route 53  │─────▶│  CloudFront  │─────▶│     ALB     │
│   (DNS)     │      │   (CDN)      │      │ (Load Bal.) │
└─────────────┘      └──────────────┘      └─────────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                         ┌────▼────┐          ┌────▼────┐         ┌────▼────┐
                         │  ECS    │          │  ECS    │         │  ECS    │
                         │ (Web)   │          │ (Web)   │         │ (Web)   │
                         └─────────┘          └─────────┘         └─────────┘
                              │                    │                    │
                              └────────────────────┼────────────────────┘
                                                   │
                                              ┌────▼─────┐
                                              │   RDS    │
                                              │(Postgres)│
                                              └──────────┘
```

### Prerequisites

- AWS Account
- AWS CLI installed and configured
- Docker installed
- Terraform (optional, for IaC)

### Step 1: Create ECR Repository

```bash
aws ecr create-repository --repository-name notechain-web
aws ecr create-repository --repository-name notechain-marketing
```

### Step 2: Build and Push Docker Images

```dockerfile
# Dockerfile (apps/web/Dockerfile)
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web
COPY packages ./packages

# Build packages first
RUN cd packages/core-crypto && bun run build
RUN cd packages/data-models && bun run build
RUN cd packages/sync-engine && bun run build
RUN cd packages/ai-engine && bun run build
RUN cd packages/ui-components && bun run build

# Build web app
WORKDIR /app/apps/web
RUN bun run build

# Production image
FROM oven/bun:1-slim

WORKDIR /app

COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", "start"]
```

```bash
# Build and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

docker build -t notechain-web -f apps/web/Dockerfile .
docker tag notechain-web:latest $ECR_REGISTRY/notechain-web:latest
docker push $ECR_REGISTRY/notechain-web:latest
```

### Step 3: Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier notechain-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --storage-encrypted
```

### Step 4: Create ECS Cluster and Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name notechain-cluster

# Create task definition (JSON)
# See: task-definition.json

# Create service
aws ecs create-service \
  --cluster notechain-cluster \
  --service-name notechain-web \
  --task-definition notechain-web-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 5: Configure Application Load Balancer

```bash
aws elbv2 create-load-balancer \
  --name notechain-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

aws elbv2 create-target-group \
  --name notechain-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --target-type ip

aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-2016-08 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

## Database Setup

### Supabase (Recommended)

1. **Create Project** at [supabase.com](https://supabase.com)

2. **Apply Migrations**:

   ```bash
   cd supabase
   supabase db push
   ```

3. **Configure Storage Buckets**:
   - User data bucket (encrypted)
   - Public assets bucket

4. **Set Up Row Level Security (RLS)**:
   - Enable RLS on all tables
   - Configure policies for user data isolation

### Neon PostgreSQL

1. **Create Project** at [neon.tech](https://neon.tech)

2. **Get Connection String**

3. **Run Migrations**:

   ```bash
   psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
   psql $DATABASE_URL -f supabase/migrations/002_storage_buckets.sql
   psql $DATABASE_URL -f supabase/migrations/003_auth_triggers.sql
   psql $DATABASE_URL -f supabase/migrations/004_sync_operations.sql
   ```

## Environment Variables

### Required Variables

```env
# Database
NEXT_PUBLIC_NEON_DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Authentication
NEXT_PUBLIC_JWT_SECRET=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_PDF_SIGNING=true
```

### Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment-specific values**
3. **Rotate secrets regularly**
4. **Use secret management services**:
   - AWS Secrets Manager
   - Vercel Environment Variables
   - HashiCorp Vault

## Post-Deployment

### 1. Verify Deployment

```bash
curl -I https://your-domain.com
# Should return 200 OK
```

### 2. Run Smoke Tests

- Test authentication flow
- Create a note
- Test sync functionality
- Verify encryption works
- Check PDF features

### 3. Configure Monitoring

See [Monitoring](#monitoring) section below.

### 4. Set Up Backups

- Database: Daily automated backups
- User data: Continuous replication
- Configuration: Version controlled

### 5. Configure CDN

- Enable caching for static assets
- Configure cache headers
- Set up purge mechanisms

## Monitoring

### Application Monitoring

**Vercel Analytics** (Vercel deployments):

```typescript
// apps/web/src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**Sentry** (Error tracking):

```bash
bun add @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Database Monitoring

- Query performance
- Connection pool usage
- Storage utilization
- Slow query log

### Infrastructure Monitoring

- CPU/Memory usage
- Request latency
- Error rates
- Traffic patterns

### Alerting

Set up alerts for:

- Error rate > 1%
- Response time > 2s
- Database connection failures
- High CPU usage (>80%)
- Low disk space (<10%)

## Troubleshooting

### Build Failures

**Error**: Module not found

```bash
# Solution: Rebuild packages
bun run clean:all
bun install
bun run build:packages
bun run build:apps
```

**Error**: TypeScript errors

```bash
# Solution: Check type definitions
bun run typecheck
# Fix errors in reported files
```

### Runtime Errors

**Error**: Database connection failed

```bash
# Check database URL
echo $NEXT_PUBLIC_NEON_DATABASE_URL

# Verify database is running
psql $NEXT_PUBLIC_NEON_DATABASE_URL -c "SELECT 1"

# Check firewall rules
```

**Error**: Environment variables undefined

```bash
# Verify variables are set in deployment platform
# For Vercel:
vercel env ls

# For AWS:
aws ecs describe-task-definition --task-definition notechain-web-task
```

### Performance Issues

**Slow response times**:

1. Check database query performance
2. Review bundle size (`ANALYZE=true bun run build`)
3. Enable caching
4. Optimize images

**High memory usage**:

1. Check for memory leaks
2. Optimize AI model loading
3. Review bundle splitting
4. Scale horizontally

## Rollback Procedure

### Vercel

```bash
# List deployments
vercel list

# Promote previous deployment
vercel promote [deployment-url]
```

### AWS ECS

```bash
# Update service to previous task definition
aws ecs update-service \
  --cluster notechain-cluster \
  --service notechain-web \
  --task-definition notechain-web-task:PREVIOUS_VERSION
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens implemented
- [ ] Secrets rotated
- [ ] Dependencies updated
- [ ] Security headers set

## Cost Optimization

- Enable caching
- Use CDN for static assets
- Right-size database instances
- Use serverless for variable loads
- Monitor and optimize queries
- Implement lazy loading
- Compress assets

## Further Reading

- [Vercel Documentation](https://vercel.com/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
