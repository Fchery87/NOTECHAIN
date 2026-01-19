## Architecture Overview

NoteChain's architecture is built upon four foundational principles that directly support our core proposition:

1. **Zero-Knowledge First**: All user data is encrypted on the client device before transmission. Our servers never have access to plaintext data, encryption keys, or decryption capabilities.
2. **Offline-First Operation**: All core functionality works without network connectivity, with intelligent synchronization when connections are restored.
3. **Privacy-Preserving Intelligence**: Analytics and insights are computed entirely on-device using local machine learning models.
4. **Cross-Platform Consistency**: A unified encryption and data model ensures seamless, secure operation across all supported platforms.

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT APPLICATIONS                           │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│  Mobile App  │  Web App    │  Desktop App │            │            │
│ (React Native│  (Next.js)  │   (Tauri)   │            │            │
│   iOS+Android)│   (PWA)     │  (Rust+React)│            │            │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
                                     │
                                     │ Encrypted Sync (Supabase Realtime)
                                     │
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND INFRASTRUCTURE                │
├─────────────────────────────────────────────────────────────────────────┤
│  • PostgreSQL Database (Row Level Security for zero-knowledge)        │
│  • Supabase Auth (JWT tokens, no plaintext user data)             │
│  • Realtime Sync (WebSocket, encrypted payloads only)              │
│  • Supabase Storage (S3-compatible, encrypted blobs)            │
│  • Edge Functions (serverless, billing hooks, push notifications)     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Encrypted Backups / Recovery Kits
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER-MANAGED STORAGE LOCATIONS                       │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│ Personal Cloud  │  USB Drive      │  Paper Backup   │  Other Personal │
│ (e.g., Proton   │  (Offline)      │  (QR Code)      │  Secure Storage │
│ Drive, iCloud)  │                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## 3. Key Technology Choices

### 3.1 Client-Side Stack

- **Cross-Platform Core**: React Native (iOS/Android), Next.js (Web), and Tauri (Desktop) sharing core React components, cryptographic modules, and data models via Bun workspaces.
- **Platform-Specific UI**:
  - iOS/Android: React Native 0.73+ with Expo Router for navigation and Expo modules for native functionality
  - Web: Next.js 14 with App Router, React Server Components, and PWA support
  - Desktop: Tauri 2.0 with Rust backend for native file system access and performance-critical operations
- **Local Database**: React Native MMKV (mobile), Dexie.js (web), Tauri storage API (desktop) - all with optional encryption layer (AES-256-GCM) for offline storage.
- **Cryptography**: libsodium via react-native-sodium (native modules) and libsodium-wrappers (web/Tauri) for secure, audited cryptographic operations.
- **PDF Engine**: react-native-pdf (mobile) and pdf-lib (web/desktop) for viewing, annotation, and signing with local processing only.

### 3.2 Encryption Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT DEVICE                          │
├─────────────────────────────────────────────────────────┤
│  User Password → PBKDF2 (310,000 iterations) →           │
│                    Password Hash (auth only)             │
├─────────────────────────────────────────────────────────┤
│  Master Key (256-bit) ← CSPRNG                           │
│        │                                                 │
│        ├─▶ Encrypt all local data (SQLite)               │
│        ├─▶ Encrypt sync blobs (AES-256-GCM)              │
│        └─▶ Encrypt Recovery Kit (with Recovery Passphrase)│
└─────────────────────────────────────────────────────────┘
```

**Critical Design Decisions**:

- Master keys are generated on-device and never transmitted.
- Each document/todo/note receives a unique encryption key derived from the master key.
- Metadata (titles, modification dates) remains encrypted; only sync timestamps are plaintext.
- End-to-end encrypted real-time sync using the Double Ratchet algorithm (Signal Protocol variant).

### 3.3 Server-Side Architecture

- **Supabase Auth**: Handles user authentication with email/password and OAuth (Google/Apple/Apple), issuing JWT tokens without storing plaintext user data or encryption keys.
- **Supabase Database**: PostgreSQL 15 with Row Level Security (RLS) ensuring users can only access their own encrypted blobs. Managed via Supabase migrations.
- **Supabase Realtime**: WebSocket-based real-time sync service that delivers encrypted deltas to connected devices without decryption capability.
- **Supabase Storage**: S3-compatible object storage for encrypted PDFs, images, and attachments with built-in CDN and access policies.
- **Supabase Edge Functions**: Serverless functions for Stripe webhooks (billing), email delivery (weekly digests), and push notifications (APNs/Firebase), receiving only encrypted or metadata payloads.
- **Billing Service**: Stripe integration via Supabase Edge Functions, storing only account tiers and expiration dates in user metadata (no usage data).

### 3.4 Data Synchronization Pattern

```rust
// Pseudo-code illustrating sync protocol
struct SyncProtocol {
    // Client sends encrypted changes
    async fn push_changes(encrypted_delta: Vec<u8>, signature: Vec<u8>) -> Result<()> {
        // Server verifies signature but cannot decrypt delta
        // Stores encrypted delta with version tag
    }

    // Client pulls changes
    async fn pull_changes(last_sync_version: u64) -> Result<Vec<EncryptedDelta>> {
        // Returns all encrypted deltas since last_sync_version
        // Conflict resolution happens client-side
    }
}
```

**Conflict Resolution**: Implemented client-side using last-write-wins with manual merge options for conflicting edits. All resolution occurs after decryption on the user's device.

## 4. Critical User Flows & Security Implications

### 4.1 Account Recovery Flow (Zero-Knowledge)

As detailed in the requirements, account recovery follows a strict user-managed process:

1. **Initial Setup**: Mandatory Recovery Kit generation during onboarding
2. **Kit Composition**:
   ```json
   {
     "version": "1.0",
     "encrypted_master_key": "<AES-256-GCM(c
   ```

## Data Models And Api

### 1.1 Encryption & Security Foundation

```rust
// Core cryptographic structures
struct UserCryptoState {
    user_id: Uuid,                    // Public identifier
    master_key_encrypted: Vec<u8>,    // Encrypted with recovery passphrase
    key_derivation_salt: [u8; 32],    // For PBKDF2
    public_signature_key: Vec<u8>,    // Ed25519 public key
    device_keys: HashMap<DeviceId, DeviceKeyEntry>,
    last_key_rotation: DateTime<Utc>,
}

struct DeviceKeyEntry {
    device_id: Uuid,
    public_exchange_key: Vec<u8>,     // X25519 for E2E sync
    encrypted_shared_secret: Vec<u8>, // Encrypted with device-specific key
    device_name: String,
    last_seen: DateTime<Utc>,
    is_trusted: bool,
}

struct EncryptedPayload {
    version: u8,                      // Protocol version
    ciphertext: Vec<u8>,              // AES-256-GCM encrypted data
    nonce: [u8; 12],                  // GCM nonce
    auth_tag: [u8; 16],               // GCM authentication tag
    key_id: Uuid,                     // Which data key was used
    metadata_hash: [u8; 32],          // Blake3 hash of encrypted metadata
}
```

### 1.2 Core Entities

#### User & Account

```typescript
interface UserAccount {
  // Server-stored (plaintext)
  id: string; // UUID v7
  email_hash: string; // SHA-256 hash of email (for billing)
  account_tier: "free" | "pro";
  subscription_status: "active" | "canceled" | "past_due";
  subscription_expires_at: Date | null;
  device_limit: number; // 1 for free, 5 for pro
  created_at: Date;

  // Client-stored (encrypted)
  encrypted_profile: EncryptedPayload; // Contains UserProfile
}

interface UserProfile {
  display_name: string;
  avatar_hash: string; // Hash of avatar image
  timezone: string;
  working_hours: {
    start: string; // "09:00"
    end: string; // "17:00"
    days: number[]; // [1,2,3,4,5] for Mon-Fri
  };
  productivity_preferences: {
    weekly_digest_enabled: boolean;
    digest_day: number; // 0-6 (Sunday-Saturday)
    digest_time: string; // "08:00"
    focus_time_recommendations: boolean;
  };
}
```

#### Todo Item

```typescript
interface TodoItem {
  id: string; // UUID v7
  user_id: string;
  title: string; // Encrypted client-side
  description: string | null; // Encrypted client-side
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";

  // Dates (stored as ISO strings, encrypted)
  created_at: string;
  updated_at: string;
  due_date: string | null;
  completed_at: string | null;

  // Metadata
  tags: string[]; // Encrypted
  project_id: string | null; // Reference to project/notebook
  estimated_minutes: number | null;
  actual_minutes: number | null;

  // Calendar integration
  calendar_event_id: string | null; // External calendar ID
  calendar_provider: "google" | "outlook" | "apple" | null;

  // Sync metadata (plaintext for server)
  sync_version: number;
  last_modified_by: string; // Device ID
  is_deleted: boolean; // Soft delete for sync
}
```

#### Note

```typescript
interface Note {
  id: string; // UUID v7
  user_id: string;
  notebook_id: string | null; // Optional organization

  // Content (encrypted client-side)
  title: string;
  content: string; // Markdown with encrypted media references
  content_hash: string; // For change detection

  // Rich content
  attachments: NoteAttachment[];
  backlinks: NoteReference[]; // Auto-generated from [[wiki-links]]

  // Metadata
  tags: string[];
  created_at: string;
  updated_at: string;
  word_count: number;

  // Security
  encryption_key_id: string; // Which data key encrypts this note
  is_locked: boolean; // Additional passphrase protection

  // Sync metadata
  sync_version: number;
  last_modified_by: string;
  is_deleted: boolean;
}

interface NoteAttachment {
  id: string;
  note_id: string;
  file_name: string; // Encrypted
  mime_type: string;
  size_bytes: number;
  storage_key: string; // Reference to encrypted blob in S3
  thumbnail_key: string | null; // For images/PDF previews
  created_at: string;
}

interface NoteReference {
  source_note_id: string;
  target_note_id: string;
  context: string; // Surrounding text for context
  created_at: string;
}
```

#### PDF Document

````typescript
interface PDFDocument {
    id: string;
    user_id: string;

    // Document info (encrypted)
    original_file_name: string;
    title: string;
    author: string | null;
    page_count: number;
    file_size: number;

    // Annotations & Signatures
    annotations: PDFAnnotation[];
    signatures: PDFSignature[];

    // Storage
    storage_key: string;             // Encrypted PDF in S3
    thumbnail_key: string;           // First page thumbnail
    encryption_key_id: string;

## Deployment And Security

### 1.1 Multi-Cloud Architecture for Resilience
NoteChain employs a multi-cloud strategy to ensure maximum uptime and avoid vendor lock-in while maintaining our privacy-first promise.

**Primary Infrastructure:**
```yaml
# Infrastructure-as-Code Template (Terraform)
module "notechain_primary" {
  source = "./modules/secure_backend"

  # Primary Region (EU - GDPR Compliant)
  region = "eu-central-1"

  # Compute Layer
  compute_tier = {
    api_servers = {
      instance_type = "t3.medium"
      min_count = 3
      max_count = 10
      scaling_metric = "CPUUtilization > 60%"
    }
    sync_servers = {
      instance_type = "c6g.large"  # Graviton for encryption ops
      min_count = 2
      max_count = 6
      scaling_metric = "NetworkPacketsIn > 10000"
    }
  }

  # Storage Configuration
  storage = {
    encrypted_blobs = {
      type = "S3"
      encryption = "AES-256"  # Server-side encryption for at-rest
      versioning = true
      lifecycle_rules = [
        {
          id = "temporary_uploads"
          prefix = "temp/"
          expiration_days = 1
        }
      ]
    }
    metadata_db = {
      type = "PostgreSQL 15"
      instance = "db.r6g.large"
      storage_encrypted = true
      backup_retention = 35  # days
    }
  }
}

# Secondary Region (US - Read Replica for Disaster Recovery)
module "notechain_dr" {
  source = "./modules/secure_backend"
  region = "us-east-2"
  is_replica = true
}
````

### 1.2 Offline-First Client Deployment

**Mobile Applications:**

- **iOS**: Distributed via App Store with automatic updates
- **Android**: Distributed via Google Play Store and direct APK download from our website
- **Update Strategy**: Critical security patches use silent updates; feature updates require user consent

**Desktop & Web:**

- **Web App**: Progressive Web App (PWA) with service workers for offline functionality
- **Desktop Apps**: Electron-based for macOS/Windows/Linux, signed with developer certificates
- **Update Channels**:
  - Stable (auto-update for all users)
  - Beta (opt-in for community testing)
  - Nightly (internal development builds)

### 1.3 Continuous Deployment Pipeline

```yaml
# GitHub Actions Workflow
name: Secure Deployment Pipeline

on:
  push:
    branches: [main, release/*]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: SAST Scan
        uses: github/codeql-action/analyze@v2
      - name: Dependency Audit
        run: bun audit --production
      - name: Container Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: "notechain/api:${{ github.sha }}"

  build-and-test:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
      - name: Build Containers
        run: docker-compose -f docker-compose.prod.yml build
      - name: Run Cryptographic Tests
        run: cargo test --release --features=crypto
      - name: Integration Tests
        run: ./scripts/run-integration-tests.sh

  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Staging
        run: ./scripts/deploy.sh staging
      - name: Smoke Tests
        run: ./scripts/smoke-test.sh
      - name: Deploy to Production (Canary)
        run: ./scripts/deploy-canary.sh 10%
      - name: Monitor Canary
        run: sleep 300 && ./scripts/check-metrics.sh
      - name: Full Rollout
        if: success()
        run: ./scripts/deploy-full.sh
```

## 2. Authentication & Authorization

### 2.1 Zero-Knowledge Authentication Flow

```typescript
// Authentication Protocol Implementation
class ZeroKnowledgeAuth {
  private static readonly SCRYPT_PARAMS = {
    N: 16384,    // CPU/memory cost
    r: 8,        // Block size
    p: 1         // Parallelization
  };

  /**
   * Registration Flow:
   * 1. Client generates master key and recovery key
   * 2. Derives auth token from master key
   * 3. Sends only hashed credentials to server
   */
  static async register(email: string, password: string): Promise<AuthResult> {
    // Client-side operations
    const masterKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const recoveryKey = await this.generateRecoveryKey();

    // Derive authentication token (never the master key)
    const authToken = await this.deriveAuthToken(masterKey, password);

    // Hash email for privacy (prevents email correlation)
    const emailHash = await this.hashEmail(email);

    // Send to server
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_hash: emailHash,
        auth_token_hash: await this.scryptHash(authToken),
        public_key: await this.exportPublicKey(masterKey),
        scrypt_params: this.SCRYPT_PARAMS
      })
    });

    return {
      master_key: masterKey,
      recovery_key: recoveryKey
```
