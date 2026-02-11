# ADR-001: Technology Stack Selection

**Status:** Accepted
**Date:** 2025-01-18
**Decision Makers:** Development Team
**Context:** NoteChain Project

## Context and Problem Statement

The project documentation contained significant contradictions regarding the technology stack:

- **Project Brief** specified Flutter/Dart for cross-platform development
- **Technical Specifications** described native iOS (SwiftUI) and Android (Kotlin) apps
- **Handoff** outlined React Native + Next.js + Electron architecture
- Documentation referenced npm workspaces but project has no actual code

This created an impossible situation for implementation, with mutually exclusive technology choices, inconsistent build processes, and unclear project structure.

## Decision

**We will use React Native for cross-platform mobile apps with Bun as the package manager and Supabase for backend infrastructure.**

### Chosen Stack

| Layer                | Technology                                      | Rationale                                                                            |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Mobile Framework** | React Native 0.73+                              | Largest ecosystem, excellent performance with Hermes, native modules for crypto      |
| **Web App**          | Next.js 14 (App Router)                         | SSR, PWA support, TypeScript-first, excellent DX                                     |
| **Desktop**          | Tauri 2.0                                       | Rust-based for better performance than Electron, smaller bundles                     |
| **Package Manager**  | Bun 1.0+                                        | 10x faster than npm, drop-in npm compatibility, native TypeScript support            |
| **Backend**          | Supabase (PostgreSQL + Realtime + Auth)         | Reduces infrastructure complexity, built-in auth, real-time sync, Row Level Security |
| **Database**         | Supabase PostgreSQL 15                          | Full SQL capabilities, encryption at rest, built-in backups                          |
| **Object Storage**   | Supabase Storage                                | Integrated with auth, supports encrypted blobs, CDN built-in                         |
| **Cryptography**     | libsodium-js + react-native-sodium              | Audited library, native modules for performance                                      |
| **Local Storage**    | React Native MMKV (iOS/Android), Dexie.js (Web) | Fast, type-safe, encrypted options available                                         |

## Alternatives Considered

### Flutter + Dart

**Pros:**

- True single codebase across iOS, Android, Web, Desktop
- Excellent performance (compiled to native)
- Beautiful UI out-of-the-box

**Cons:**

- Smaller talent pool than React ecosystem
- More complex integration with existing React-based tools
- Less mature ecosystem for complex PDF handling
- **REJECTED:** Team expertise lies in React ecosystem

### Native iOS (SwiftUI) + Android (Kotlin)

**Pros:**

- Best possible performance
- Full access to platform features
- Native UI components

**Cons:**

- Requires 2-3 separate codebases
- 3x+ development time
- Duplicated logic increases bugs
- **REJECTED:** Too expensive for MVP timeline

### Next.js + Electron (Desktop)

**Pros:**

- Shared React codebase with web
- Rich ecosystem

**Cons:**

- Electron bundles are 100MB+ (vs 5-10MB Tauri)
- Higher memory usage
- Worse battery life on laptops
- **REJECTED:** Tauri offers better UX for desktop

### npm + pnpm + Yarn

**Pros:**

- Established, widely used
- Large ecosystem

**Cons:**

- Slower than Bun (10x)
- No native TypeScript support
- More complex monorepo setup
- **REJECTED:** Bun offers superior DX and performance

### Custom Infrastructure (PostgreSQL + MinIO + Node.js)

**Pros:**

- Full control over stack
- No vendor lock-in

**Cons:**

- 3-6 months infrastructure setup
- DevOps overhead
- Auth implementation from scratch
- Real-time sync requires complex WebSocket setup
- **REJECTED:** Supabase accelerates MVP by 6+ months

## Consequences

### Positive

- **Faster Development:** React Native + Supabase reduces infrastructure work by 6+ months
- **Unified Ecosystem:** Same React patterns across mobile, web, desktop
- **Better Developer Experience:** Bun's speed improves iteration time
- **Reduced Maintenance:** Supabase handles auth, database management, backups
- **Lower Costs:** Serverless model scales with usage, minimal fixed infrastructure
- **Built-in Security:** Row Level Security enforces data privacy at database level

### Negative

- **Vendor Lock-in:** Supabase dependency (can mitigate with migrations to self-hosted PostgREST)
- **Learning Curve:** Team must learn Supabase-specific patterns
- **Platform Differences:** React Native still requires platform-specific code for some features

## Architecture Implications

### Monorepo Structure

```
notechain/
├── apps/
│   ├── mobile/              # React Native (iOS/Android)
│   │   ├── src/
│   │   ├── package.json     # Bun-managed
│   │   └── tsconfig.json
│   ├── web/                # Next.js 14
│   │   ├── src/
│   │   ├── package.json
│   │   └── next.config.js
│   └── desktop/             # Tauri 2.0
│       ├── src-tauri/       # Rust backend
│       ├── src/             # React frontend
│       └── package.json
├── packages/
│   ├── core-crypto/          # Shared crypto logic
│   ├── data-models/          # TypeScript interfaces
│   ├── sync-engine/          # CRDT logic
│   └── ui-components/        # Shared React components
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── edge-functions/
├── bun.lockb               # Single lockfile for monorepo
├── package.json
└── README.md
```

### Development Workflow

```bash
# Install dependencies (Bun)
bun install

# Run mobile app
cd apps/mobile
bun run ios    # or android

# Run web app
cd apps/web
bun run dev

# Run desktop app
cd apps/desktop
bun run tauri dev

# Database migrations
bun run supabase:push

# Type-check all packages
bun run typecheck
```

### Cryptography Implementation

```typescript
// packages/core-crypto/src/keyManager.ts
import * as sodium from 'libsodium-wrappers';

export class KeyManager {
  async generateMasterKey(): Promise<CryptoKey> {
    await sodium.ready;
    const key = sodium.randombytes_buf(32);
    return key;
  }

  async encryptData(data: Uint8Array, key: Uint8Array): Promise<EncryptedData> {
    await sodium.ready;
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = sodium.crypto_secretbox_easy(data, nonce, key);
    return { ciphertext, nonce };
  }
}
```

### Supabase Row Level Security (RLS)

```sql
-- Ensure users can only access their own encrypted blobs
CREATE POLICY "Users can view own blobs"
ON encrypted_blobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blobs"
ON encrypted_blobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

## Related Decisions

- **ADR-002:** Monorepo Management with Bun Workspaces
- **ADR-003:** Offline-First Data Sync Strategy
- **ADR-004:** Zero-Knowledge Encryption Implementation

## Migration Path

If Supabase becomes a constraint:

1. Export PostgreSQL schema and data via `supabase db dump`
2. Migrate to self-hosted PostgREST + PostgreSQL
3. Update connection URLs in environment variables
4. Minimal code changes required (client uses Supabase client API)

## References

- React Native: https://reactnative.dev/
- Bun: https://bun.sh/
- Supabase: https://supabase.com/docs
- Tauri: https://tauri.app/
- libsodium: https://doc.libsodium.org/

## Signoff

**Approved by:** Development Team Lead
**Effective Date:** 2025-01-18
**Review Date:** 2026-01-18 (Annual review)
