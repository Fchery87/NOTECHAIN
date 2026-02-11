# NoteChain Implementation Roadmap

**Created:** 2026-01-19  
**Timeline:** 26 weeks (6 months)  
**Team Size:** Solo developer  
**Status:** Draft

---

## Executive Summary

This roadmap addresses the 15 issues identified in the validation report (3 critical, 6 high, 4 medium, 2 low) and implements Epic 1 (Foundation & Privacy Architecture) through Epic 6 (Security, Compliance & Transparency). The plan prioritizes removing development blockers, establishing a solid foundation, then building features incrementally with quality gates at each phase.

**Validation Report Score:** 78/100 → **Target:** 90+ (Perfectionist State)

---

## Overview

### Timeline

| Phase   | Duration    | Weeks                                         | Primary Focus |
| ------- | ----------- | --------------------------------------------- | ------------- |
| Phase 0 | Weeks 1-2   | Critical resolution (framework, architecture) |
| Phase 1 | Week 3      | Complete critical documentation               |
| Phase 2 | Week 4      | Development environment setup                 |
| Phase 3 | Weeks 5-8   | Epic 1: Foundation & Privacy Architecture     |
| Phase 4 | Weeks 9-14  | Epic 2: Unified Core Applications             |
| Phase 5 | Weeks 15-18 | Epic 3: Smart Sync & Integration Engine       |
| Phase 6 | Weeks 19-22 | Epic 5: Platform Launch & Monetization        |
| Phase 7 | Weeks 23-26 | Epic 6: Security, Compliance & Transparency   |

**Total:** 26 weeks (6 months)

### Technology Stack Decision

**Selected:** React Native + Next.js + Tauri + Bun + Supabase

**Rationale:**

- Better web integration (PWA support)
- Larger talent pool for future hiring
- Mature offline-first ecosystem (MMKV, Dexie)
- Better separation of concerns across platforms

**Trade-offs:**

- Three codebases instead of one (vs Flutter)
- More complex build process
- Higher maintenance overhead initially

---

## Phase 0: Critical Resolution (Weeks 1-2)

**Goal:** Remove all blockers preventing development

### Week 1: Resolve Framework & Architecture Contradictions

**Issues:** CRIT-002, CRIT-003

**Actions:**

1. **Create ADR-002** - Framework Decision
   - Document React Native choice with justification
   - Address Flutter alternative and why it was rejected
   - Include performance benchmarks and team considerations
   - Store in `docs/adr/ADR-002-framework-choice.md`

2. **Update Project Brief** (lines 30-37)
   - Replace Flutter references with React Native stack
   - Update cross-platform section to reflect chosen architecture
   - Ensure consistency with Handoff document

3. **Validate Across All Documents**
   - Brief, PRD, Specs, Stories, Handoff
   - Replace conflicting technology references
   - Ensure database (PostgreSQL + SQLite) consistency
   - Verify crypto stack (libsodium) alignment

4. **Create Architecture Diagram**
   - Visual representation of chosen stack
   - Show data flow: Client → Encryption → Supabase → Other Clients
   - Include platform-specific components (iOS Keychain, Android Keystore)

**Success Criteria:**

- All documentation consistently references React Native stack
- ADR-002 approved and committed
- No technology contradictions remain across 6 documents

### Week 2: Infrastructure Foundation

**Issues:** CRIT-001, HIGH-004, MED-001

**Actions:**

1. **Initialize Monorepo Structure**

   ```
   notechain/
   ├── apps/
   │   ├── mobile/              # React Native (iOS/Android)
   │   ├── web/                # Next.js 14 PWA
   │   └── desktop/            # Tauri (Rust + React)
   ├── packages/
   │   ├── core-crypto/        # Shared cryptographic operations
    │   ├── data-models/        # TypeScript interfaces & Supabase types
   │   ├── sync-engine/        # CRDT-based sync logic
   │   └── ui-components/      # Shared React components
    ├── supabase/
    │   ├── migrations/         # SQL schema migrations
    │   └── functions/         # Edge functions (webhooks, push notifications)
   ├── docs/
   ├── .gitignore
   └── package.json           # Bun workspace root
   ```

2. **Set Up Bun Workspaces**
   - Create root `package.json` with workspace configuration
   - Configure package hoisting for shared dependencies
   - Set up workspace protocol (@notechain/\*)

3. **Initialize Supabase Project**
   - Create Supabase project via CLI or dashboard
   - Configure database (PostgreSQL 15)
   - Set up Row Level Security (RLS)
   - Create storage buckets for encrypted blobs

4. **Create Initial .env.example Files**
   - `apps/mobile/.env.example`
   - `apps/web/.env.example`
   - `apps/desktop/.env.example`
   - `supabase/.env.example`

5. **Configure TypeScript**
   - Root `tsconfig.json` with path mappings
   - Shared ESLint/Prettier configuration
   - Strict mode enabled globally

**Success Criteria:**

- Monorepo structure initialized
- Bun workspaces working (can install dependencies)
- Supabase project created and accessible
- All .env.example files documented

---

## Phase 1: Complete Critical Documentation (Week 3)

**Goal:** Fill gaps preventing independent development

**Issues:** HIGH-002, HIGH-004, MED-001, MED-003

### Database Schema (HIGH-004)

**Create Prisma Schema:** `supabase/schema.prisma`

```prisma
model User {
  id            String   @id @default(uuid())
  emailHash     String   @unique
  accountTier   String   @default("free") // "free" or "pro"
  createdAt     DateTime @default(now())
  encryptedBlobs EncryptedBlob[]
  devices       Device[]

  @@index([emailHash])
}

model EncryptedBlob {
  id           String   @id @default(uuid())
  userId       String
  ciphertext   Bytes
  nonce        Bytes    // 12 bytes for AES-256-GCM
  authTag      Bytes    // 16 bytes for AES-256-GCM
  keyId        String   // Reference to device-specific key
  version      Int      @default(1)
  blobType     String   // "note", "todo", "pdf", "calendar"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([blobType])
}

model Device {
  id        String   @id @default(uuid())
  userId    String
  publicKey String   // Public key for asymmetric encryption
  name      String   // Device name (e.g., "iPhone 15 Pro")
  lastSeen  DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Migration Script:** Create initial migration

- Apply schema to Supabase database
- Set up RLS policies (users can only access their own data)
- Create indexes for performance

**Deliverable:** `supabase/migrations/001_initial_schema.sql`

### API Specification (HIGH-002)

**Create OpenAPI 3.1 Spec:** `docs/api/openapi-spec.yaml`

**Endpoints:**

**Authentication**

- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/biometric-unlock` - Biometric authentication
- `POST /api/auth/oauth/google` - OAuth callback
- `POST /api/auth/oauth/apple` - OAuth callback

**Sync**

- `POST /api/sync/push` - Upload encrypted data changes
- `GET /api/sync/pull` - Download encrypted data for device
- `POST /api/sync/resolve-conflict` - Manual conflict resolution

**Device Management**

- `POST /api/devices/register` - Register new device
- `GET /api/devices/list` - List all user devices
- `DELETE /api/devices/revoke` - Revoke device access

**Blob Storage**

- `POST /api/blobs/upload` - Upload encrypted blob
- `GET /api/blobs/download/{blobId}` - Download encrypted blob
- `DELETE /api/blobs/{blobId}` - Delete blob

**Each endpoint includes:**

- Request/response schemas
- Authentication headers (`Authorization: Bearer <token>`)
- Error codes and messages
- Rate limiting rules

**Deliverable:** `docs/api/openapi-spec.yaml`

### Environment Variables (MED-001)

**Create Comprehensive Documentation:** `docs/configuration/environment-variables.md`

**Mobile Apps (apps/mobile/.env.example):**

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Encryption Configuration
ENCRYPTION_ALGORITHM=AES-256-GCM
KEY_DERIVATION_ITERATIONS=310000
NONCE_LENGTH=12
AUTH_TAG_LENGTH=16

# Biometrics
BIOMETRIC_UNLOCK_ENABLED=true
BIOMETRIC_RETRY_COUNT=3

# Sync Configuration
SYNC_QUEUE_MAX_SIZE=1000
SYNC_RETRY_DELAY_MS=5000
SYNC_MAX_RETRIES=5

# Analytics (Privacy-Preserving)
ANALYTICS_ENABLED=false  # Disabled by default, opt-in only
ANALYTICS_ENDPOINT=https://analytics.notechain.tech
```

**Web App (apps/web/.env.example):**

```bash
# All mobile variables plus:
WEB_PUSH_PUBLIC_KEY=your-vapid-public-key
WEB_PUSH_PRIVATE_KEY=your-vapid-private-key

# PWA Configuration
PWA_NAME=NoteChain
PWA_SHORT_NAME=NoteChain
PWA_THEME_COLOR=#1a1a1a

# Service Worker
SERVICE_WORKER_UPDATE_INTERVAL=3600000  # 1 hour
```

**Relay Server (supabase/.env.example):**

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/notechain

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY_HOURS=24
JWT_REFRESH_EXPIRY_DAYS=7

# S3/Storage
STORAGE_ENDPOINT=https://s3.example.com
STORAGE_BUCKET=notechain-encrypted-blobs
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key
STORAGE_REGION=us-east-1

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
ALLOW_PLAINTEXT=false  # Never allow unencrypted data

# Logging
LOG_LEVEL=warn  # error, warn, info, debug
LOG_FORMAT=json  # json, text
```

**Deliverable:** `docs/configuration/environment-variables.md`

### Error Handling Specification (MED-003)

**Create Error Code Taxonomy:** `docs/api/error-codes.md`

```typescript
enum ErrorCode {
  // Authentication (AUTH-xxx)
  AUTH_INVALID_CREDENTIALS = 'AUTH-001',
  AUTH_TOKEN_EXPIRED = 'AUTH-002',
  AUTH_TOKEN_INVALID = 'AUTH-003',
  AUTH_DEVICE_LIMIT_EXCEEDED = 'AUTH-004',
  AUTH_BIOMETRIC_FAILED = 'AUTH-005',
  AUTH_EMAIL_ALREADY_EXISTS = 'AUTH-006',

  // Sync (SYNC-xxx)
  SYNC_CONFLICT_DETECTED = 'SYNC-001',
  SYNC_ENCRYPTION_FAILED = 'SYNC-002',
  SYNC_QUEUE_FULL = 'SYNC-003',
  SYNC_NETWORK_ERROR = 'SYNC-004',
  SYNC_VERSION_MISMATCH = 'SYNC-005',

  // Encryption (CRYPT-xxx)
  CRYPT_KEY_NOT_FOUND = 'CRYPT-001',
  CRYPT_DECRYPTION_FAILED = 'CRYPT-002',
  CRYPT_INVALID_NONCE = 'CRYPT-003',
  CRYPT_KEY_DERIVATION_FAILED = 'CRYPT-004',

  // Storage (STOR-xxx)
  STOR_QUOTA_EXCEEDED = 'STOR-001',
  STOR_BLOB_NOT_FOUND = 'STOR-002',
  STOR_UPLOAD_FAILED = 'STOR-003',

  // General (GEN-xxx)
  GEN_NETWORK_ERROR = 'GEN-001',
  GEN_SERVER_ERROR = 'GEN-002',
  GEN_RATE_LIMITED = 'GEN-003',
  GEN_INVALID_REQUEST = 'GEN-004',
  GEN_FEATURE_NOT_AVAILABLE = 'GEN-005',
}

interface AppError {
  code: ErrorCode;
  userMessage: string; // Friendly, actionable message
  technicalDetails: string; // Detailed info for debugging (only in dev)
  isRetryable: boolean;
  retryAfterMs?: number; // For rate limiting
}
```

**Examples:**

- AUTH-001: "Invalid email or password. Please try again or reset your password."
- SYNC-001: "Another device made changes to this item. Choose which version to keep."
- CRYPT-001: "Encryption key not found. Please re-login to restore access."

**Deliverable:** `docs/api/error-codes.md`

**Success Criteria:**

- Database schema defined and applied
- API specification complete with all endpoints
- All environment variables documented with defaults
- Error handling taxonomy defined

---

## Phase 2: Development Environment Setup (Week 4)

**Goal:** Ready to write code with proper tooling

**Issues:** MED-002

### Monorepo Structure Implementation

**Create Package.json Files:**

**Root:** `package.json`

```json
{
  "name": "notechain",
  "version": "0.0.1",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun run --filter=@notechain/mobile dev",
    "build": "bun run build --filter='apps/*'",
    "test": "bun run test --filter='@notechain/*'",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:push": "supabase db push",
    "supabase:generate": "supabase gen types typescript"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "prettier": "^3.0.0",
    "typescript": "^5.2.0",
    "husky": "^8.0.3",
    "lint-staged": "^14.0.1"
  }
}
```

**Mobile App:** `apps/mobile/package.json`

```json
{
  "name": "@notechain/mobile",
  "version": "0.0.1",
  "main": "index.js",
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.73.0",
    "@notechain/core-crypto": "workspace:*",
    "@notechain/data-models": "workspace:*",
    "@notechain/sync-engine": "workspace:*",
    "@notechain/ui-components": "workspace:*",
    "react-native-mmkv": "^2.12.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "zustand": "^4.4.0"
  }
}
```

**Web App:** `apps/web/package.json`

```json
{
  "name": "@notechain/web",
  "version": "0.0.1",
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "@notechain/core-crypto": "workspace:*",
    "@notechain/data-models": "workspace:*",
    "@notechain/sync-engine": "workspace:*",
    "@notechain/ui-components": "workspace:*",
    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.7"
  }
}
```

**Packages:** `packages/core-crypto/package.json`

```json
{
  "name": "@notechain/core-crypto",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "libsodium-wrappers": "^0.7.13"
  }
}
```

### Code Quality Tools

**ESLint Configuration:** `.eslintrc.json`

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

**Prettier Configuration:** `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

**TypeScript Configuration:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@notechain/*": ["packages/*/src"]
    }
  }
}
```

**Pre-commit Hooks:** `package.json` additions

```json
{
  "scripts": {
    "prepare": "husky install",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### CI/CD Pipeline

**Create:** `.github/workflows/test.yml`

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run test
      - run: bun run typecheck
```

**Create:** `.github/workflows/security-scan.yml`

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun audit
      - uses: actions/setup-go@v4
      - run: cargo audit # If using Rust in Tauri
```

**Create:** `.github/workflows/build.yml`

```yaml
name: Build

on: [push, pull_request]

jobs:
  build-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd apps/mobile && bun run build

  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd apps/web && bun run build
```

### Testing Infrastructure

**Create Test Configuration:** `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!**/*.d.ts', '!**/node_modules/**'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Create E2E Test Config:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

**Deliverables:**

- All package.json files created
- ESLint, Prettier, TypeScript configured
- Husky pre-commit hooks set up
- CI/CD workflows created
- Jest and Playwright configured

**Success Criteria:**

- `bun install` works across workspace
- Linting runs successfully
- Tests can run (even if they fail initially)
- CI/CD pipeline passes on first commit

---

## Phase 3: Epic 1 - Foundation & Privacy Architecture (Weeks 5-8)

**Goal:** Implement core infrastructure before any features

### Week 5: Core Cryptographic Package

**Package:** `packages/core-crypto`

**Implement:**

**File:** `src/encryption.ts`

```typescript
import * as sodium from 'libsodium-wrappers';

export class EncryptionService {
  private static async ready() {
    await sodium.ready;
  }

  /**
   * Encrypts data using AES-256-GCM
   */
  static async encrypt(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<{
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    authTag: Uint8Array;
  }> {
    await this.ready();

    const nonce = sodium.randombytes_buf(12); // 12 bytes for GCM
    const { ciphertext, authTag } = sodium.crypto_aead_aes256gcm_encrypt(data, null, nonce, key);

    return { ciphertext, nonce, authTag };
  }

  /**
   * Decrypts data using AES-256-GCM
   */
  static async decrypt(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    authTag: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    await this.ready();

    return sodium.crypto_aead_aes256gcm_decrypt(ciphertext, null, authTag, nonce, key);
  }

  /**
   * Derives encryption key from password using PBKDF2
   */
  static async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number = 310000
  ): Promise<Uint8Array> {
    await this.ready();

    return sodium.crypto_pwhash(
      32, // 256 bits
      password,
      salt,
      iterations,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );
  }

  /**
   * Generates a random encryption key
   */
  static async generateKey(): Promise<Uint8Array> {
    await this.ready();
    return sodium.randombytes_buf(32); // 256 bits
  }
}
```

**File:** `src/key-management.ts`

```typescript
import * as Keychain from 'react-native-keychain';
import { EncryptionService } from './encryption';

export class KeyManager {
  private static MASTER_KEY_SERVICE = 'notechain.master';
  private static DEVICE_KEY_SERVICE = 'notechain.device';

  /**
   * Stores master key in secure storage (iOS Keychain / Android Keystore)
   */
  static async storeMasterKey(key: Uint8Array): Promise<void> {
    const keyString = Array.from(key).join(',');
    await Keychain.setGenericPassword('master_key', keyString, {
      service: this.MASTER_KEY_SERVICE,
    });
  }

  /**
   * Retrieves master key from secure storage
   */
  static async getMasterKey(): Promise<Uint8Array | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.MASTER_KEY_SERVICE,
      });
      if (credentials) {
        const keyString = credentials.password;
        return new Uint8Array(keyString.split(',').map(Number));
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Derives and stores device-specific encryption key
   */
  static async deriveDeviceKey(deviceId: string, masterKey: Uint8Array): Promise<Uint8Array> {
    const salt = new TextEncoder().encode(deviceId);
    const deviceKey = await EncryptionService.deriveKey(Array.from(masterKey).join(','), salt);
    return deviceKey;
  }
}
```

**File:** `src/index.ts`

```typescript
export { EncryptionService } from './encryption';
export { KeyManager } from './key-management';
```

**Tests:** `src/__tests__/encryption.test.ts`

```typescript
import { EncryptionService } from '../encryption';

describe('EncryptionService', () => {
  it('should encrypt and decrypt data correctly', async () => {
    const data = new TextEncoder().encode('Hello, NoteChain!');
    const key = await EncryptionService.generateKey();

    const { ciphertext, nonce, authTag } = await EncryptionService.encrypt(data, key);

    const decrypted = await EncryptionService.decrypt(ciphertext, nonce, authTag, key);

    expect(decrypted).toEqual(data);
  });

  it('should derive consistent keys from same password', async () => {
    const password = 'test-password-123';
    const salt = await EncryptionService.generateKey();

    const key1 = await EncryptionService.deriveKey(password, salt);
    const key2 = await EncryptionService.deriveKey(password, salt);

    expect(key1).toEqual(key2);
  });

  it('should generate unique keys', async () => {
    const key1 = await EncryptionService.generateKey();
    const key2 = await EncryptionService.generateKey();

    expect(key1).not.toEqual(key2);
  });
});
```

**Testing:**

- Unit tests for all crypto operations
- Verify deterministic encryption with test vectors
- Test edge cases (empty data, large payloads, invalid keys)
- Security tests (timing attack resistance)

**Success Criteria:**

- All unit tests pass
- Encryption/decryption roundtrips work
- Keys are stored securely in Keychain/Keystore
- No plaintext keys in localStorage or AsyncStorage

### Week 6: Data Models & Database Layer

**Package:** `packages/data-models`

**Implement:**

**File:** `src/types/user.ts`

```typescript
export interface User {
  id: string;
  emailHash: string;
  accountTier: 'free' | 'pro';
  createdAt: Date;
}

export interface EncryptedBlob {
  id: string;
  userId: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  authTag: Uint8Array;
  keyId: string;
  version: number;
  blobType: 'note' | 'todo' | 'pdf' | 'calendar';
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  publicKey: string;
  name: string;
  lastSeen: Date;
}

export interface Note {
  id: string;
  title: string; // Encrypted
  content: string; // Encrypted
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Todo {
  id: string;
  title: string; // Encrypted
  description?: string; // Encrypted
  dueDate?: Date; // Encrypted
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PDF {
  id: string;
  filename: string; // Encrypted
  fileData: Uint8Array; // Encrypted
  annotations?: string; // Encrypted
  signature?: string; // Encrypted
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string; // Encrypted
  description?: string; // Encrypted
  startDate: Date;
  endDate: Date;
  externalId?: string; // For sync with Google/Outlook/Apple
  createdAt: Date;
  updatedAt: Date;
}
```

**File:** `src/database/client.ts`

```typescript
import { PrismaClient } from '@prisma/client';

export class DatabaseClient {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
    }
    return this.instance;
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
    }
  }
}
```

**File:** `src/repositories/user-repository.ts`

```typescript
import { DatabaseClient } from '../database/client';
import { User } from '../types/user';

export class UserRepository {
  private prisma = DatabaseClient.getInstance();

  async createUser(emailHash: string, accountTier: 'free' | 'pro' = 'free'): Promise<User> {
    const user = await this.prisma.user.create({
      data: { emailHash, accountTier },
    });
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getUserByEmailHash(emailHash: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { emailHash } });
  }

  async updateUserAccountTier(userId: string, tier: 'free' | 'pro'): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { accountTier: tier },
    });
  }
}
```

**File:** `src/repositories/blob-repository.ts`

```typescript
import { DatabaseClient } from '../database/client';
import { EncryptedBlob } from '../types/user';

export class BlobRepository {
  private prisma = DatabaseClient.getInstance();

  async saveEncryptedBlob(
    userId: string,
    ciphertext: Buffer,
    nonce: Buffer,
    authTag: Buffer,
    keyId: string,
    blobType: 'note' | 'todo' | 'pdf' | 'calendar'
  ): Promise<EncryptedBlob> {
    return this.prisma.encryptedBlob.create({
      data: {
        userId,
        ciphertext,
        nonce,
        authTag,
        keyId,
        blobType,
      },
    });
  }

  async getBlobById(id: string): Promise<EncryptedBlob | null> {
    return this.prisma.encryptedBlob.findUnique({ where: { id } });
  }

  async getUserBlobs(userId: string, blobType?: string): Promise<EncryptedBlob[]> {
    return this.prisma.encryptedBlob.findMany({
      where: {
        userId,
        ...(blobType && { blobType }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteBlob(id: string): Promise<void> {
    await this.prisma.encryptedBlob.delete({ where: { id } });
  }
}
```

**Tests:** `src/__tests__/repositories.test.ts`

```typescript
import { UserRepository } from '../repositories/user-repository';
import { BlobRepository } from '../repositories/blob-repository';
import { DatabaseClient } from '../database/client';

describe('Repositories', () => {
  afterAll(async () => {
    await DatabaseClient.disconnect();
  });

  describe('UserRepository', () => {
    const userRepo = new UserRepository();

    it('should create and retrieve user', async () => {
      const emailHash = 'hash123';
      const user = await userRepo.createUser(emailHash);

      expect(user.emailHash).toBe(emailHash);
      expect(user.accountTier).toBe('free');

      const retrieved = await userRepo.getUserByEmailHash(emailHash);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(user.id);
    });
  });

  describe('BlobRepository', () => {
    const blobRepo = new BlobRepository();
    const userRepo = new UserRepository();

    it('should save and retrieve encrypted blob', async () => {
      const user = await userRepo.createUser('hash456');
      const ciphertext = Buffer.from('encrypted data');
      const nonce = Buffer.alloc(12);
      const authTag = Buffer.alloc(16);

      const blob = await blobRepo.saveEncryptedBlob(
        user.id,
        ciphertext,
        nonce,
        authTag,
        'key123',
        'note'
      );

      expect(blob.userId).toBe(user.id);
      expect(blob.blobType).toBe('note');

      const retrieved = await blobRepo.getBlobById(blob.id);
      expect(retrieved).not.toBeNull();
    });
  });
});
```

**Migration:** Apply initial schema

```bash
bun run supabase:push
bun run supabase:generate
```

**Success Criteria:**

- All types defined
- Repositories implemented and tested
- Database schema applied
- RLS policies prevent cross-user access
- Tests pass (80%+ coverage for critical paths)

### Week 7: Sync Engine Foundation

**Package:** `packages/sync-engine`

**Implement:**

**File:** `src/crdt/lww-element-set.ts`

```typescript
/**
 * Last-Write-Wins Element Set
 * Simple CRDT for conflict resolution
 */
export class LWWElementSet<T> {
  private addSet: Map<string, { value: T; timestamp: number }> = new Map();
  private removeSet: Map<string, { timestamp: number }> = new Map();

  /**
   * Adds an element with a timestamp
   */
  add(elementId: string, value: T, timestamp: number): void {
    const existing = this.addSet.get(elementId);
    if (!existing || timestamp > existing.timestamp) {
      this.addSet.set(elementId, { value, timestamp });
    }
  }

  /**
   * Removes an element with a timestamp
   */
  remove(elementId: string, timestamp: number): void {
    const existing = this.removeSet.get(elementId);
    if (!existing || timestamp > existing.timestamp) {
      this.removeSet.set(elementId, { timestamp });
    }
  }

  /**
   * Returns the current state of the set
   */
  values(): T[] {
    const result: T[] = [];
    for (const [id, added] of this.addSet) {
      const removed = this.removeSet.get(id);
      if (!removed || added.timestamp > removed.timestamp) {
        result.push(added.value);
      }
    }
    return result;
  }

  /**
   * Merges another LWWElementSet into this one
   */
  merge(other: LWWElementSet<T>): void {
    for (const [id, added] of other.addSet) {
      this.add(id, added.value, added.timestamp);
    }
    for (const [id, removed] of other.removeSet) {
      this.remove(id, removed.timestamp);
    }
  }
}
```

**File:** `src/queue/sync-queue.ts`

```typescript
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  blobId: string;
  data: Uint8Array;
  timestamp: number;
  retryCount: number;
}

export class SyncQueue {
  private queue: SyncOperation[] = [];
  private maxQueueSize = 1000;
  private processing = false;

  /**
   * Adds an operation to the sync queue
   */
  async enqueue(operation: SyncOperation): Promise<void> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Sync queue full');
    }

    this.queue.push(operation);
    await this.persistQueue();

    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Processes queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const operation = this.queue[0];

        try {
          await this.sendOperation(operation);
          this.queue.shift(); // Remove successful operation
          operation.retryCount = 0;
        } catch (error) {
          operation.retryCount++;

          // Retry with exponential backoff
          const delayMs = 5000 * Math.pow(2, operation.retryCount);
          await this.sleep(delayMs);

          if (operation.retryCount >= 5) {
            // Max retries reached, move to end of queue
            this.queue.shift();
            this.queue.push(operation);
          }
        }

        await this.persistQueue();
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Sends an operation to the server
   */
  private async sendOperation(operation: SyncOperation): Promise<void> {
    // Implementation depends on API client
    // This is a placeholder
    console.log('Sending operation:', operation.id);
  }

  /**
   * Persists queue to local storage
   */
  private async persistQueue(): Promise<void> {
    // Implementation depends on platform (MMKV, Dexie, etc.)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**File:** `src/change-detection.ts`

```typescript
export interface Change {
  blobId: string;
  type: 'create' | 'update' | 'delete';
  data: Uint8Array;
  timestamp: number;
}

export class ChangeDetector {
  private localSnapshot: Map<string, { hash: string; timestamp: number }> = new Map();

  /**
   * Detects changes since last sync
   */
  detectChanges(localBlobs: Map<string, Uint8Array>, remoteHashes: Map<string, string>): Change[] {
    const changes: Change[] = [];

    for (const [blobId, data] of localBlobs) {
      const localHash = this.hash(data);
      const remoteHash = remoteHashes.get(blobId);

      if (!remoteHash) {
        // New blob
        changes.push({
          blobId,
          type: 'create',
          data,
          timestamp: Date.now(),
        });
      } else if (localHash !== remoteHash) {
        // Modified blob
        changes.push({
          blobId,
          type: 'update',
          data,
          timestamp: Date.now(),
        });
      }
    }

    // Detect deleted blobs
    for (const blobId of remoteHashes.keys()) {
      if (!localBlobs.has(blobId)) {
        changes.push({
          blobId,
          type: 'delete',
          data: new Uint8Array(0),
          timestamp: Date.now(),
        });
      }
    }

    return changes;
  }

  /**
   * Updates local snapshot
   */
  updateSnapshot(blobId: string, data: Uint8Array): void {
    const hash = this.hash(data);
    this.localSnapshot.set(blobId, {
      hash,
      timestamp: Date.now(),
    });
  }

  /**
   * Simple hash function (replace with proper hash in production)
   */
  private hash(data: Uint8Array): string {
    let hash = 0;
    for (const byte of data) {
      hash = (hash << 5) - hash + byte;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}
```

**File:** `src/index.ts`

```typescript
export { LWWElementSet } from './crdt/lww-element-set';
export { SyncQueue, type SyncOperation } from './queue/sync-queue';
export { ChangeDetector, type Change } from './change-detection';
```

**Tests:** `src/__tests__/crdt.test.ts`

```typescript
import { LWWElementSet } from '../crdt/lww-element-set';

describe('LWWElementSet', () => {
  it('should add and retrieve elements', () => {
    const set = new LWWElementSet<string>();
    set.add('1', 'Alice', 1000);
    set.add('2', 'Bob', 1001);

    const values = set.values();
    expect(values).toContain('Alice');
    expect(values).toContain('Bob');
  });

  it('should respect last-write-wins', () => {
    const set = new LWWElementSet<string>();
    set.add('1', 'Alice', 1000);
    set.add('1', 'Bob', 1001); // Same ID, later timestamp

    const values = set.values();
    expect(values).toContain('Bob');
    expect(values).not.toContain('Alice');
  });

  it('should handle removals correctly', () => {
    const set = new LWWElementSet<string>();
    set.add('1', 'Alice', 1000);
    set.remove('1', 1001);

    const values = set.values();
    expect(values).not.toContain('Alice');
  });

  it('should merge two sets correctly', () => {
    const set1 = new LWWElementSet<string>();
    const set2 = new LWWElementSet<string>();

    set1.add('1', 'Alice', 1000);
    set2.add('2', 'Bob', 1001);

    set1.merge(set2);

    const values = set1.values();
    expect(values).toContain('Alice');
    expect(values).toContain('Bob');
  });
});
```

**Testing:**

- Simulate concurrent edits across devices
- Test offline queue accumulation and replay
- Verify conflict resolution produces consistent state

**Success Criteria:**

- LWWElementSet correctly resolves conflicts
- Sync queue persists and replays operations
- Change detection identifies all modifications
- Tests pass (80%+ coverage)

### Week 8: Zero-Knowledge Authentication Flow

**Implement across all apps:**

**File:** `apps/mobile/src/services/auth-service.ts`

```typescript
import * as sodium from 'libsodium-wrappers';
import * as Keychain from 'react-native-keychain';
import { UserRepository } from '@notechain/data-models';
import { EncryptionService } from '@notechain/core-crypto';

export class AuthService {
  private static TOKEN_SERVICE = 'notechain.token';

  /**
   * Registers new user (password never sent to server)
   */
  static async register(
    email: string,
    password: string
  ): Promise<{ userId: string; token: string }> {
    await sodium.ready;

    // Hash email for privacy
    const emailHash = sodium.crypto_generichash(32, sodium.from_string(email));

    // Create user in database (only emailHash stored)
    const userRepo = new UserRepository();
    const user = await userRepo.createUser(sodium.to_hex(emailHash));

    // Derive master key from password (client-side only)
    const salt = sodium.randombytes_buf(16);
    const masterKey = await EncryptionService.deriveKey(password, salt, 310000);

    // Store master key in secure storage
    const masterKeyString = Array.from(masterKey).join(',');
    await Keychain.setGenericPassword('master_key', masterKeyString);

    // Generate device key
    const deviceId = await this.getDeviceId();
    const deviceKey = await EncryptionService.deriveKey(
      password,
      sodium.from_string(deviceId),
      310000
    );

    // Generate JWT token
    const token = this.generateToken(user.id);

    return { userId: user.id, token };
  }

  /**
   * Logs in user (password validation is client-side)
   */
  static async login(email: string, password: string): Promise<{ userId: string; token: string }> {
    await sodium.ready;

    // Hash email
    const emailHash = sodium.crypto_generichash(32, sodium.from_string(email));
    const emailHashHex = sodium.to_hex(emailHash);

    // Check if user exists
    const userRepo = new UserRepository();
    const user = await userRepo.getUserByEmailHash(emailHashHex);
    if (!user) {
      throw new Error('User not found');
    }

    // Derive master key (must match registration)
    const deviceId = await this.getDeviceId();
    const salt = sodium.from_string(deviceId); // Simplified
    const masterKey = await EncryptionService.deriveKey(password, salt, 310000);

    // Store master key
    const masterKeyString = Array.from(masterKey).join(',');
    await Keychain.setGenericPassword('master_key', masterKeyString);

    // Generate token
    const token = this.generateToken(user.id);

    return { userId: user.id, token };
  }

  /**
   * Biometric unlock (quick access without password)
   */
  static async biometricUnlock(): Promise<{ userId: string; token: string }> {
    // Retrieve stored master key
    const credentials = await Keychain.getGenericPassword();
    if (!credentials) {
      throw new Error('No credentials stored');
    }

    // Parse user ID from storage (simplified)
    const userId = 'user-123'; // In reality, store userId separately

    // Generate token
    const token = this.generateToken(userId);

    return { userId, token };
  }

  /**
   * Refreshes JWT token
   */
  static async refreshToken(): Promise<string> {
    const credentials = await Keychain.getGenericPassword();
    if (!credentials) {
      throw new Error('Not authenticated');
    }

    const userId = 'user-123'; // Parse from storage
    return this.generateToken(userId);
  }

  /**
   * Generates recovery keys (account recovery without server reset)
   */
  static async generateRecoveryKeys(): Promise<string[]> {
    const masterKey = await this.getMasterKey();
    const recoveryKeys: string[] = [];

    for (let i = 0; i < 3; i++) {
      const recoveryKey = await EncryptionService.encrypt(
        masterKey,
        await EncryptionService.generateKey()
      );
      recoveryKeys.push(this.encodeRecoveryKey(recoveryKey));
    }

    return recoveryKeys;
  }

  /**
   * Revokes all devices and logs out
   */
  static async logout(): Promise<void> {
    await Keychain.resetGenericPassword();
  }

  private static getMasterKey(): Promise<Uint8Array> {
    return Keychain.getGenericPassword().then(credentials => {
      if (!credentials) {
        throw new Error('Not authenticated');
      }
      return new Uint8Array(credentials.password.split(',').map(Number));
    });
  }

  private static getDeviceId(): Promise<string> {
    // Generate unique device ID (simplified)
    return Promise.resolve('device-123');
  }

  private static generateToken(userId: string): string {
    // In production, use proper JWT library
    return `jwt.${userId}.${Date.now()}`;
  }

  private static encodeRecoveryKey(data: Uint8Array): string {
    // Base32 or similar human-readable encoding
    return Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

**Tests:** `apps/mobile/src/services/__tests__/auth-service.test.ts`

```typescript
import { AuthService } from '../auth-service';

describe('AuthService', () => {
  it('should register user and derive keys', async () => {
    const result = await AuthService.register('test@example.com', 'password123');

    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('token');
  });

  it('should login user with correct credentials', async () => {
    // First register
    await AuthService.register('test2@example.com', 'password123');

    // Then login
    const result = await AuthService.login('test2@example.com', 'password123');

    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('token');
  });

  it('should generate recovery keys', async () => {
    await AuthService.register('test3@example.com', 'password123');

    const recoveryKeys = await AuthService.generateRecoveryKeys();

    expect(recoveryKeys).toHaveLength(3);
    recoveryKeys.forEach(key => {
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    });
  });

  it('should logout successfully', async () => {
    await AuthService.register('test4@example.com', 'password123');
    await AuthService.logout();

    // Verify logout by attempting biometric unlock
    await expect(AuthService.biometricUnlock()).rejects.toThrow();
  });
});
```

**E2E Flow Test:** `e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('register → login → biometric unlock → refresh', async ({ page }) => {
    // Register
    await page.goto('http://localhost:3000/register');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/);

    // Logout
    await page.click('button[aria-label="Logout"]');

    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/);

    // Biometric unlock (mock in E2E)
    await page.click('button[aria-label="Biometric Unlock"]');
    await expect(page.locator('.toast')).toContainText('Unlocked successfully');
  });
});
```

**Success Criteria:**

- Register flow creates user, derives keys, stores securely
- Login flow validates password, retrieves keys
- Biometric unlock works without password re-entry
- Refresh token flow works
- Recovery keys generated correctly
- Server never receives plaintext password

---

## Phase 4: Epic 2 - Unified Core Applications (Weeks 9-14)

**Goal:** Implement core feature modules

### Week 9-10: Task Management (Todos)

**Implement:**

**File:** `apps/mobile/src/services/todo-service.ts`

```typescript
import { EncryptionService } from '@notechain/core-crypto';
import { Todo } from '@notechain/data-models';
import { SyncQueue } from '@notechain/sync-engine';

export class TodoService {
  private syncQueue: SyncQueue;
  private masterKey: Uint8Array;

  constructor(masterKey: Uint8Array) {
    this.masterKey = masterKey;
    this.syncQueue = new SyncQueue();
  }

  /**
   * Creates a new task
   */
  async createTodo(todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> {
    const newTodo: Todo = {
      id: this.generateId(),
      ...todo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Encrypt task
    const encrypted = await this.encryptTodo(newTodo);

    // Queue for sync
    await this.syncQueue.enqueue({
      id: this.generateId(),
      type: 'create',
      blobId: newTodo.id,
      data: encrypted,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // Store locally
    await this.storeLocally(newTodo.id, encrypted);

    return newTodo;
  }

  /**
   * Updates an existing task
   */
  async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
    const existing = await this.getTodo(id);
    if (!existing) {
      throw new Error('Todo not found');
    }

    const updated: Todo = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    const encrypted = await this.encryptTodo(updated);

    await this.syncQueue.enqueue({
      id: this.generateId(),
      type: 'update',
      blobId: id,
      data: encrypted,
      timestamp: Date.now(),
      retryCount: 0,
    });

    await this.storeLocally(id, encrypted);

    return updated;
  }

  /**
   * Deletes a task
   */
  async deleteTodo(id: string): Promise<void> {
    await this.syncQueue.enqueue({
      id: this.generateId(),
      type: 'delete',
      blobId: id,
      data: new Uint8Array(0),
      timestamp: Date.now(),
      retryCount: 0,
    });

    await this.deleteLocally(id);
  }

  /**
   * Lists all tasks
   */
  async listTodos(): Promise<Todo[]> {
    const encryptedTodos = await this.listLocally();
    const todos: Todo[] = [];

    for (const { id, data } of encryptedTodos) {
      const todo = await this.decryptTodo(data);
      todos.push({ ...todo, id });
    }

    return todos;
  }

  private encryptTodo(todo: Todo): Promise<Uint8Array> {
    const json = JSON.stringify(todo);
    const data = new TextEncoder().encode(json);
    return EncryptionService.encrypt(data, this.masterKey);
  }

  private async decryptTodo(encrypted: Uint8Array): Promise<Todo> {
    const decrypted = await EncryptionService.decrypt(encrypted, this.masterKey);
    const json = new TextDecoder().decode(decrypted);
    return JSON.parse(json);
  }

  private generateId(): string {
    return `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeLocally(id: string, data: Uint8Array): Promise<void> {
    // Platform-specific storage (MMKV, Dexie, etc.)
  }

  private async deleteLocally(id: string): Promise<void> {
    // Platform-specific storage
  }

  private async listLocally(): Promise<Array<{ id: string; data: Uint8Array }>> {
    // Platform-specific storage
    return [];
  }

  private async getTodo(id: string): Promise<Todo | null> {
    const todos = await this.listTodos();
    return todos.find(t => t.id === id) || null;
  }
}
```

**UI Components:**

**File:** `apps/mobile/src/components/TodoList.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Todo } from '@notechain/data-models';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onPress: (todo: Todo) => void;
}

export function TodoList({ todos, onToggle, onPress }: TodoListProps) {
  const renderTodo = ({ item }: { item: Todo }) => (
    <TouchableOpacity
      style={[
        styles.todoItem,
        item.status === 'completed' && styles.completed,
      ]}
      onPress={() => onPress(item)}
      onLongPress={() => onToggle(item.id)}
    >
      <View style={styles.checkbox}>
        {item.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
        {item.dueDate && (
          <Text style={styles.dueDate}>
            Due: {item.dueDate.toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={[styles.priorityBadge, styles[item.priority]]}>
        <Text style={styles.priorityText}>{item.priority}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={todos}
      renderItem={renderTodo}
      keyExtractor={item => item.id}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  todoItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  completed: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  high: {
    backgroundColor: '#FF6B6B',
  },
  medium: {
    backgroundColor: '#FFD93D',
  },
  low: {
    backgroundColor: '#6BCB77',
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
```

**File:** `apps/mobile/src/components/TodoForm.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  DatePickerIOS,
} from 'react-native';

interface TodoFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (todo: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority: 'high' | 'medium' | 'low';
  }) => void;
}

export function TodoForm({ visible, onClose, onSubmit }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({
      title,
      description,
      dueDate,
      priority,
    });

    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setPriority('medium');
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Task</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Task title"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Priority:</Text>
          {(['high', 'medium', 'low'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityButton,
                priority === p && styles.selected,
              ]}
              onPress={() => setPriority(p)}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === p && styles.selectedText,
                ]}
              >
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {dueDate && (
          <DatePickerIOS
            date={dueDate}
            onDateChange={setDueDate}
            style={styles.datePicker}
          />
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>Create Task</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  cancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginRight: 8,
  },
  priorityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  selected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priorityButtonText: {
    fontSize: 14,
  },
  selectedText: {
    color: '#fff',
  },
  datePicker: {
    marginBottom: 12,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Success Criteria:**

- Todo CRUD operations work offline and sync
- Tasks encrypted before storage
- UI displays tasks with all attributes
- Calendar integration displays due dates
- Recurring tasks implemented (Pro feature)

### Week 11: Encrypted Note-Taking

**Implement:**

**File:** `apps/web/src/components/NoteEditor.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlock from '@tiptap/extension-code-block';
import Placeholder from '@tiptap/extension-placeholder';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function NoteEditor({ content, onChange }: NoteEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.commands.setContent(content);
  }, [content, editor]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="editor">
      <div className="toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'active' : ''}
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'active' : ''}
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'active' : ''}
        >
          {'</>'}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
        >
          H2
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
```

**Success Criteria:**

- Rich-text editor with Markdown support
- Notes encrypted before storage
- Folders/notebooks organization
- Basic search (title-only for Free tier)
- Image attachments (encrypted)

### Week 12-13: PDF Workflow

**Implement:**

**File:** `packages/pdf-signature/src/signature-capture.tsx`

```typescript
import React, { useRef, useState } from 'react';
import { View, SignatureView } from 'react-native-signature-canvas';

interface SignatureCaptureProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
}

export function SignatureCapture({ onSave, onCancel }: SignatureCaptureProps) {
  const signatureRef = useRef<SignatureView>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setIsEmpty(true);
  };

  const handleSave = () => {
    signatureRef.current?.readSignature().then(signature => {
      onSave(signature);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Document</Text>
      <Text style={styles.subtitle}>Draw your signature in the box below</Text>

      <View style={styles.canvasContainer}>
        <SignatureView
          ref={signatureRef}
          onOK={handleSave}
          onEmpty={() => setIsEmpty(true)}
          onClear={() => setIsEmpty(true)}
          descriptionText=""
          clearText="Clear"
          confirmText="Save"
          style={styles.signatureCanvas}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClear}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={isEmpty}
        >
          <Text style={styles.buttonText}>Save Signature</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  signatureCanvas: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  clearButton: {
    backgroundColor: '#FFD93D',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Success Criteria:**

- PDF import and storage (encrypted)
- Native PDF rendering
- Basic annotation (highlight, underline, freehand)
- Digital signature capture (Pro feature)

### Week 14: Calendar Integration

**Implement:**

**File:** `apps/web/src/services/calendar-service.ts`

```typescript
interface ExternalEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  source: 'google' | 'outlook' | 'apple';
}

export class CalendarService {
  /**
   * Syncs with Google Calendar
   */
  static async syncWithGoogle(accessToken: string): Promise<ExternalEvent[]> {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.summary,
      description: item.description,
      startDate: new Date(item.start.dateTime || item.start.date),
      endDate: new Date(item.end.dateTime || item.end.date),
      source: 'google' as const,
    }));
  }

  /**
   * Pushes NoteChain task to external calendar
   */
  static async pushToExternalCalendar(
    task: { id: string; title: string; dueDate?: Date },
    calendarId: string,
    source: 'google' | 'outlook' | 'apple',
    accessToken: string
  ): Promise<void> {
    const event = {
      summary: task.title,
      description: `Created in NoteChain`,
      start: task.dueDate
        ? { dateTime: task.dueDate.toISOString() }
        : { date: new Date().toISOString().split('T')[0] },
      end: task.dueDate
        ? { dateTime: task.dueDate.toISOString() }
        : { date: new Date().toISOString().split('T')[0] },
    };

    let url: string;
    if (source === 'google') {
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    } else if (source === 'outlook') {
      url = 'https://graph.microsoft.com/v1.0/me/events';
    } else {
      throw new Error('Apple Calendar sync not implemented yet');
    }

    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  }
}
```

**Success Criteria:**

- Two-way sync with Google Calendar, Outlook, Apple Calendar
- Display external events in-app
- Push NoteChain tasks to external calendars
- Calendar view (day, week, month)

---

## Phase 5: Epic 3 - Smart Sync & Integration Engine (Weeks 15-18)

**Goal:** Polish sync, add advanced features

### Week 15-16: Advanced Sync Features

**Implement:**

- Improved conflict resolution (user choice: merge, keep local, keep remote)
- Sync progress indicators and error recovery
- Bandwidth optimization (delta sync, compression)
- Background sync with platform-specific APIs

**Success Criteria:**

- Stress test sync with 10,000+ items
- Test sync interruption and recovery
- Verify sync works with poor network conditions

### Week 17: Productivity Intelligence (Pro Feature)

**Implement:**

- Weekly analytics calculation (local, on-device)
- Task completion rate tracking
- Peak productivity hours detection
- Burnout risk alerts (simple threshold-based)
- Email digest generation (client-side, server as relay)

**Success Criteria:**

- Analytics calculated locally (no data sent to server)
- Weekly report generated accurately
- Email digest sent via privacy-preserving relay

### Week 18: Integration Polish

**Implement:**

- Deep linking between features (create task from note, add event from task)
- Unified search across all modules (Pro feature - full-text search)
- Import/export functionality (migrate from other apps)
- Keyboard shortcuts and accessibility improvements

**Success Criteria:**

- Integration tests for cross-module workflows
- Accessibility audit (WCAG AA compliance)
- Performance profiling for heavy workloads

---

## Phase 6: Epic 5 - Platform Launch & Monetization (Weeks 19-22)

**Goal:** Implement billing, launch preparation, and growth features

### Week 19: Monetization Infrastructure

**Implement:**

- Stripe integration for subscriptions ($4.99/mo, $49/year)
- In-app purchase (IAP) handling for mobile (RevenueCat or native IAP)
- Subscription status checking and feature gating
- Add-on purchase flow (templates, custom themes)
- Billing history and invoice generation

**Feature Gating Logic:**

```typescript
export class FeatureGate {
  static async canAccessFeature(
    userId: string,
    feature: 'pdf-signing' | 'multi-device' | 'analytics' | 'full-search'
  ): Promise<boolean> {
    const user = await getUser(userId);

    switch (feature) {
      case 'pdf-signing':
        return user.accountTier === 'pro';
      case 'multi-device':
        const deviceCount = await getDeviceCount(userId);
        return user.accountTier === 'pro' || deviceCount < 1;
      case 'analytics':
        return user.accountTier === 'pro';
      case 'full-search':
        return user.accountTier === 'pro';
      default:
        return true;
    }
  }
}
```

**Success Criteria:**

- Stripe/webhook processing works in sandbox
- IAP sandbox tests pass
- Feature gates work correctly
- Test subscription cancellation/downgrade

### Week 20: Growth Features (Viral Mechanics)

**Implement:**

- "Trojan Horse" feature: Watermark on signed PDFs
- Share encrypted notes (read-only) with non-users
- Referral program with incentives
- Waitlist system and invite codes
- Social sharing buttons for privacy manifesto

**Success Criteria:**

- Viral coefficient (K-factor) > 0.5
- Share flow works for non-users
- Referral system tracks conversions

### Week 21: Deployment & Launch Preparation

**Implement:**

- Production deployment pipeline (canary releases)
- Monitoring and alerting setup (Prometheus/Grafana)
- Log aggregation without PII (Loki or ELK)
- Error tracking (Sentry with privacy filters)
- Performance monitoring (APM)

**Success Criteria:**

- Monitoring dashboard operational
- Error tracking captures issues without PII
- Deployment pipeline tested in staging

### Week 22: Launch Execution

**Launch Activities:**

- Deploy to App Store, Google Play, web
- "Privacy Manifesto" content campaign launch
- Community engagement (Reddit, Hacker News)
- Initial push notification campaigns
- Monitor metrics: signup rates, conversion, viral coefficient

**Success Criteria:**

- Apps approved by app stores
- First 1,000 beta users onboarded
- Initial revenue generated

---

## Phase 7: Epic 6 - Security, Compliance & Transparency (Weeks 23-26)

**Goal:** Validate security posture, achieve compliance

### Week 23: Security Audit Preparation

**Actions:**

- Conduct internal security review of all crypto code
- Review third-party dependencies for vulnerabilities
- Document security architecture for external auditors
- Prepare test cases for auditors

**Deliverables:**

- Security architecture document
- Dependencies vulnerability report
- Test coverage report for security-critical paths

### Week 24: Third-Party Security Audit

**Actions:**

- Contract with Cure53, NCC Group, or Trail of Bits
- Provide code access and documentation
- Support audit process
- Review and classify findings

**Post-Audit:**

- Address all Critical and High findings immediately
- Address Medium findings within 2 weeks
- Document all fixes and remediations

**Success Criteria:**

- Zero critical vulnerabilities
- Zero high severity vulnerabilities
- All medium findings addressed

### Week 25: Compliance Certification

**GDPR Compliance:**

- Review data handling practices
- Implement "Right to be Forgotten"
- Create privacy policy and data processing agreement
- Conduct DPIA

**CCPA Compliance:**

- Implement data portability export
- Create opt-out mechanism
- Update privacy policy

**Success Criteria:**

- GDPR compliance report
- CCPA compliance verification
- Updated privacy policy

### Week 26: Transparency Initiatives

**Implement:**

- Publish transparency report
- Open source core-crypto package
- Create public security.txt
- Set up status page
- Document encryption implementation

**Success Criteria:**

- Transparency report published
- Crypto modules open sourced
- Status page operational

---

## Success Metrics

### Quality Gates

| Phase   | Gate                   | Success Criteria                                                                     |
| ------- | ---------------------- | ------------------------------------------------------------------------------------ |
| Phase 0 | Critical resolution    | No technology contradictions, monorepo initialized                                   |
| Phase 1 | Documentation complete | Database schema, API spec, env vars, error codes documented                          |
| Phase 2 | Environment ready      | Linting, testing, CI/CD working                                                      |
| Phase 3 | Epic 1 complete        | Crypto operations working, database functional, sync operational, auth flow complete |
| Phase 4 | Epic 2 complete        | All core features implemented and tested                                             |
| Phase 5 | Epic 3 complete        | Advanced sync working, analytics functional, integrations polished                   |
| Phase 6 | Epic 5 complete        | Billing operational, growth features deployed, apps launched                         |
| Phase 7 | Epic 6 complete        | Security audit passed, compliance certified, transparency initiatives live           |

### KPIs to Track

**Development:**

- Lines of code written
- Test coverage percentage
- Bug count and severity
- Time spent per epic

**Security:**

- Vulnerability scan results
- Audit findings (Critical, High, Medium, Low)
- Time to remediate security issues

**Launch:**

- Signup rate (target: 1,000 beta users in first month)
- Conversion rate (target: 2.5% Free → Pro)
- Viral coefficient (target: > 0.5)
- Churn rate (target: < 5% monthly)

---

## Risk Assessment

### High Risks

1. **Security Vulnerabilities**
   - Probability: Medium
   - Impact: Critical
   - Mitigation: Third-party audit, regular security reviews, penetration testing

2. **Performance Issues with Encryption**
   - Probability: Medium
   - Impact: High
   - Mitigation: Performance testing, hardware acceleration, lazy loading

3. **Sync Conflicts**
   - Probability: High
   - Impact: Medium
   - Mitigation: Robust CRDT implementation, user-friendly conflict resolution UI

### Medium Risks

1. **Platform-Specific Bugs**
   - Probability: High
   - Impact: Medium
   - Mitigation: Comprehensive testing on all platforms, beta testing program

2. **App Store Rejection**
   - Probability: Medium
   - Impact: High
   - Mitigation: Follow guidelines carefully, pre-review with platform teams

3. **Low Conversion Rate**
   - Probability: Medium
   - Impact: Medium
   - Mitigation: Value proposition refinement, feature gating optimization, user feedback loops

### Low Risks

1. **Dependency Updates Breaking Changes**
   - Probability: Medium
   - Impact: Low
   - Mitigation: Pin versions, automated testing, gradual rollouts

2. **Infrastructure Costs Overrun**
   - Probability: Low
   - Impact: Medium
   - Mitigation: Monitoring, cost optimization, auto-scaling

---

## Resource Requirements

### Development Tools

- **IDE:** VS Code / JetBrains Fleet
- **Version Control:** Git with GitHub
- **Package Manager:** Bun
- **Database:** PostgreSQL (via Supabase)
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Error Tracking:** Sentry
- **API Testing:** Postman / Insomnia

### Third-Party Services

- **Backend:** Supabase ($25/month for Pro tier)
- **Payments:** Stripe (2.9% + $0.30 per transaction)
- **Mobile IAP:** RevenueCat (12% of revenue)
- **Email:** Resend or SendGrid (pay per send)
- **Monitoring:** Datadog or New Relic (optional for solo dev)

### Budget Estimate (First 6 Months)

- **Development tools:** $0 (free tiers)
- **Supabase:** $150 ($25/month × 6)
- **Hosting (web):** $0 (Vercel free tier)
- **Domain:** $12/year
- **Audit:** $5,000 - $15,000 (one-time, scheduled for week 24)
- **Total:** ~$5,162 - $15,162

---

## Next Steps

1. **Review and approve** this roadmap with stakeholders
2. **Create task breakdown** for Phase 0 (Weeks 1-2)
3. **Begin Phase 0** by resolving framework/architecture contradictions
4. **Create ADR-002** documenting framework decision
5. **Initialize monorepo** structure
6. **Set up Supabase** project
7. **Begin Epic 1** implementation (Week 5)

---

## Appendix: Technology Stack Rationale

### Why React Native over Flutter?

1. **Web Integration:** React Native + Next.js share React ecosystem
2. **Talent Pool:** Larger developer pool familiar with React
3. **Mature Ecosystem:** Better support for offline-first databases
4. **TypeScript:** Native TypeScript support vs Dart

### Why Bun over npm/yarn?

1. **Performance:** 10x faster installation
2. **TypeScript:** Built-in TypeScript support
3. **Modern:** Modern tooling with better DX
4. **Compatibility:** Drop-in replacement for npm

### Why Supabase over Firebase?

1. **PostgreSQL:** More powerful database than Firebase Realtime DB
2. **SQL:** Familiar query language
3. **Open Source:** Can self-host if needed
4. **Row Level Security:** Built-in zero-knowledge architecture support

### Why libsodium over Web Crypto API?

1. **Consistent API:** Same API across all platforms
2. **Hardware Acceleration:** Native bindings for better performance
3. **Battle-Tested:** Used by many security-critical applications
4. **Future-Proof:** Modern cryptographic primitives

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Status:** Draft, awaiting approval
