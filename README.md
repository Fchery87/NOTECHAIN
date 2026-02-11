# NoteChain

**Privacy-first, web-based productivity suite with military-grade end-to-end encryption**

NoteChain is a comprehensive, web-based productivity suite—featuring intelligent task management, encrypted note-taking, PDF workflows, calendar integration, and personal analytics—all in a single, zero-knowledge application. Your data is encrypted in your browser and never accessible to NoteChain servers or third parties.

## 🌟 Key Features

- **Zero-Knowledge Encryption** - All data encrypted with AES-256-GCM in your browser
- **Offline-First PWA** - Full functionality without internet connection using service workers
- **Responsive Web Design** - Works seamlessly on desktop, tablet, and mobile browsers
- **PDF Signing** - Legally valid digital signatures with mouse/touch input
- **Smart Calendar Sync** - Two-way sync with Google, Outlook, and Apple Calendar
- **On-Device Analytics** - Weekly productivity insights without data exfiltration
- **Open Source** - Cryptographic modules are publicly auditable

## 🏗️ Technology Stack

| Component           | Technology                                        |
| ------------------- | ------------------------------------------------- |
| **Web Application** | Next.js 14 (App Router, PWA)                      |
| **Package Manager** | Bun 1.0+                                          |
| **Backend**         | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| **Database**        | PostgreSQL 15 with Row Level Security             |
| **Cryptography**    | libsodium-wrappers                                |
| **Local Storage**   | Dexie.js (IndexedDB wrapper)                      |
| **State**           | Zustand                                           |

## 📁 Project Structure

```
notechain/
├── apps/
│   └── web/                # Next.js 14 PWA
├── packages/
│   ├── core-crypto/        # Shared cryptographic operations
│   ├── data-models/        # TypeScript interfaces & Supabase types
│   ├── sync-engine/        # CRDT-based sync logic
│   └── ui-components/      # Shared React components
├── supabase/
│   ├── migrations/         # SQL schema migrations
│   ├── functions/          # Edge functions (webhooks, push notifications)
│   └── storage/            # Storage policies and buckets
├── docs/
│   ├── adr/                # Architecture Decision Records
│   ├── brief/              # Project brief
│   ├── prd/                # Product Requirements Document
│   ├── specs/              # Technical specifications
│   └── stories/            # User stories and tasks
├── package.json            # Root package (Bun workspaces)
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Bun** 1.0+ (package manager and runtime)
- **Supabase CLI** for local development
- **Git** (for version control)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-org/notechain.git
cd notechain

# 2. Install dependencies
bun install

# 3. Start local Supabase
cd supabase
supabase start

# 4. Apply database migrations
cd ..
bun run supabase:push

# 5. Generate TypeScript types
bun run supabase:generate
```

### Running the Web App

```bash
cd apps/web
bun run dev
# Opens at http://localhost:3000
```

## 🔐 Security Architecture

### Zero-Knowledge Design

1. **Client-Side Encryption**: All user data is encrypted in the browser using AES-256-GCM before any network transmission
2. **Master Keys**: Generated in the browser and stored in secure browser storage
3. **Server Role**: Supabase servers only store encrypted ciphertext and cannot decrypt your data
4. **Row Level Security**: Database policies ensure users can only access their own encrypted blobs
5. **Open Source**: Core cryptographic modules are publicly auditable

### Encryption Flow

```
User Data → AES-256-GCM Encryption (Browser)
           ↓
    Encrypted Ciphertext + Nonce + Auth Tag
           ↓
    Supabase Storage (Zero-Knowledge)
           ↓
    Retrieved by Other Sessions
           ↓
    Browser Decryption with Master Key
           ↓
    User Data Restored
```

## 📊 Data Model

Core entities are stored in encrypted form:

- **Notes** - Rich-text content with Markdown support
- **Todos** - Tasks with priorities, due dates, calendar integration
- **PDFs** - Documents with annotations and digital signatures
- **Notebooks** - Folders for organizing notes
- **Projects** - Tags/collections for organizing todos
- **Sessions** - Browser sessions with encryption keys for multi-session sync

All content is encrypted client-side; only metadata (hashes, versions, timestamps) is stored in plaintext for sync coordination.

## 🔄 Sync Architecture

### Offline-First PWA

- All operations work without internet connection using service workers
- Changes are queued locally and encrypted
- On reconnection, Supabase Realtime delivers encrypted deltas
- Conflict resolution uses last-write-wins with manual merge options

### Session Management

- **Free Tier**: 1 browser session maximum
- **Pro Tier**: 5 sessions with seamless sync

## 📦 Monorepo Commands

```bash
# Install all dependencies
bun install

# Run web app in development
bun run dev

# Build web app
bun run build

# Run all tests
bun run test

# Type-check all packages
bun run typecheck

# Lint all code
bun run lint

# Format all code
bun run format

# Clean all node_modules and lockfiles
bun run clean
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests for specific package
bun run test --filter="@notechain/core-crypto"
```

## 🛠️ Development Tools

### Supabase CLI

```bash
# Start local Supabase instance
bun run supabase:start

# Stop local Supabase
bun run supabase:stop

# Push migrations to database
bun run supabase:push

# Generate TypeScript types from schema
bun run supabase:generate

# Reset local database
supabase db reset
```

### Database Access

```bash
# Connect to local PostgreSQL
supabase db connect

# Open Supabase Studio (GUI)
supabase studio
# Opens at http://localhost:54323
```

## 📖 Documentation

- [Project Brief](docs/brief/) - Overview and strategic objectives
- [Product Requirements](docs/prd/) - Functional and non-functional requirements
- [Technical Specifications](docs/specs/) - Architecture and data models
- [User Stories](docs/stories/) - Epics, user stories, and technical tasks
- [Architecture Decisions](docs/adr/) - ADRs documenting key technology choices
- [Project Handoff](docs/handoff/) - Setup guide and development workflows

## 🎯 Project Status

**Current Phase**: 📋 Documentation Complete, Ready for Implementation

### Completed

- ✅ Technology stack selected (Next.js + Bun + Supabase)
- ✅ Database schema defined with Row Level Security
- ✅ Monorepo structure configured
- ✅ Comprehensive documentation (1,800+ lines)
- ✅ Security architecture designed
- ✅ Web-first architecture specified

### In Progress

- 🔄 Core cryptographic implementation
- 🔄 Encrypted local database layer
- 🔄 Zero-knowledge authentication flow

### Planned

- 📅 Epic 1: Foundation & Privacy Architecture
- 📅 Epic 2: Unified Core Applications
- 📅 Epic 3: Smart Sync & Integration Engine
- 📅 Epic 4: On-Device Intelligence & Analytics
- 📅 Epic 5: Platform Launch & Monetization Stack
- 📅 Epic 6: Security, Compliance & Transparency

## 🔑 Environment Variables

See `.env.example` files in each app directory for required environment variables.

### Common Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase API endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ENCRYPTION_ALGORITHM` - AES-256-GCM (default)
- `KEY_DERIVATION_ITERATIONS` - 310000 (default)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Code Style

- Use **Prettier** for formatting
- Follow **ESLint** rules
- Write tests for all new functionality
- Document security-sensitive code extensively

### Security

- All crypto changes require security lead review
- Never commit secrets or API keys
- Use `bun run supabase:generate` for type safety

## 📄 License

Proprietary - All rights reserved. Copyright © 2025 NoteChain.

## 🐛 Bug Reports

Report security vulnerabilities to security@notechain.tech
Report bugs via [GitHub Issues](https://github.com/your-org/notechain/issues)

## 💬 Community

- **Website**: https://notechain.tech
- **Documentation**: https://docs.notechain.tech
- **Blog**: https://blog.notechain.tech
- **Twitter/X**: @NoteChainApp

---

**Built with ❤️ for privacy-conscious professionals**

Zero-Knowledge Productivity. Your data, your keys, your life.
