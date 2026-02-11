# NoteChain Development Environment Setup Guide

This guide will help you set up your local development environment for the NoteChain project.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Bun** (>= 1.0.0) - [Installation Guide](https://bun.sh/docs/installation)
- **Node.js** (>= 20.0.0) - For compatibility checks
- **Git** - For version control
- **PostgreSQL Client** (optional) - For direct database access

### Recommended Tools

- **VS Code** or your preferred IDE
- **Docker** (optional) - For local Supabase development
- **Supabase CLI** (optional) - For database migrations

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/notechain.git
cd notechain
```

## Step 2: Install Dependencies

NoteChain uses Bun workspaces. Install all dependencies from the project root:

```bash
bun install
```

This will install dependencies for:

- All packages (core-crypto, data-models, sync-engine, ai-engine, ui-components)
- Web application
- Marketing website

## Step 3: Environment Configuration

### Web Application

1. Navigate to the web app directory:

   ```bash
   cd apps/web
   ```

2. Copy the environment example file:

   ```bash
   cp .env.example .env.local
   ```

3. Edit `.env.local` and fill in the required values:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Neon Database
   NEXT_PUBLIC_NEON_DATABASE_URL=postgresql://user:password@host/notechain
   NEON_PRIVATE_KEY=your-private-key

   # OAuth Providers (optional for local development)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-secret

   NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-secret

   # JWT Secret (generate with: openssl rand -base64 32)
   NEXT_PUBLIC_JWT_SECRET=your-generated-secret
   ```

### Marketing Website (Optional)

```bash
cd apps/marketing
cp .env.example .env.local
# Edit .env.local as needed for analytics, forms, etc.
```

## Step 4: Database Setup

### Option A: Using Supabase (Recommended)

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Get your project URL and anon key from Settings > API

3. Run migrations:

   ```bash
   cd supabase
   supabase db push
   ```

### Option B: Using Neon

1. Create a Neon project at [neon.tech](https://neon.tech)

2. Get your connection string

3. Apply migrations manually using the SQL files in `supabase/migrations/`

## Step 5: Build Packages

Build all packages in the correct order:

```bash
# From project root
bun run build:packages
```

This builds:

- @notechain/core-crypto
- @notechain/data-models
- @notechain/sync-engine
- @notechain/ai-engine
- @notechain/ui-components

## Step 6: Verify Setup

Run the validation script to ensure everything is configured correctly:

```bash
bun run validate
```

This will:

- ✅ Check code formatting
- ✅ Run ESLint
- ✅ Run TypeScript type checking
- ✅ Run all tests

## Step 7: Start Development

### Start the web application:

```bash
bun run dev
```

The app will be available at: http://localhost:3000

### Start the marketing site (optional):

```bash
bun run dev:marketing
```

The marketing site will be available at: http://localhost:3001

## Common Issues and Solutions

### Issue: Bun not found

**Solution:** Install Bun from https://bun.sh

```bash
curl -fsSL https://bun.sh/install | bash
```

### Issue: TypeScript errors in packages

**Solution:** Rebuild packages in order

```bash
bun run build:packages
```

### Issue: Missing environment variables

**Solution:** Check that you've created `.env.local` files and filled in all required values. Use `.env.example` as a template.

### Issue: Database connection fails

**Solution:** Verify your database URL is correct and the database is accessible. For Supabase, ensure your IP is whitelisted in the dashboard.

### Issue: Port already in use

**Solution:** Kill the process using the port or change the port:

```bash
# Web app (default: 3000)
cd apps/web
PORT=3001 bun run dev

# Marketing (default: 3001)
cd apps/marketing
PORT=3002 bun run dev
```

### Issue: Module not found errors

**Solution:** Clean and reinstall dependencies

```bash
bun run clean:all
bun install
bun run build:packages
```

## Development Workflow

### Running Tests

```bash
# Run all tests
bun run test

# Run tests with coverage
bun run test:ci

# Run tests for specific package
cd packages/core-crypto
bun test
```

### Linting and Formatting

```bash
# Check formatting
bun run format:check

# Fix formatting
bun run format

# Run ESLint
bun run lint

# Fix ESLint errors
bun run lint:fix
```

### Type Checking

```bash
# Check all packages
bun run typecheck

# Check only apps
bun run typecheck:apps
```

### Building for Production

```bash
# Build everything
bun run build

# Build only packages
bun run build:packages

# Build only apps
bun run build:apps
```

## Project Structure

```
NOTECHAIN/
├── apps/
│   ├── web/              # Main Next.js application
│   └── marketing/        # Marketing website
├── packages/
│   ├── core-crypto/      # Encryption & key management
│   ├── data-models/      # TypeScript types & models
│   ├── sync-engine/      # CRDT & sync logic
│   ├── ai-engine/        # AI/ML features
│   └── ui-components/    # Shared React components
├── docs/                 # Documentation
├── supabase/            # Database migrations
└── .github/             # CI/CD workflows
```

## Next Steps

- Read [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- Review [Architecture Documentation](./architecture/notechain-architecture.md)
- Check [API Documentation](./api/endpoints.md)
- See [Deployment Guide](./deployment/DEPLOYMENT.md) for production deployment

## Getting Help

If you encounter issues not covered in this guide:

1. Check existing [GitHub Issues](https://github.com/your-org/notechain/issues)
2. Search the documentation in `docs/`
3. Ask in the project Discord/Slack (if applicable)
4. Create a new GitHub issue with detailed information

## Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Neon Documentation](https://neon.tech/docs)
