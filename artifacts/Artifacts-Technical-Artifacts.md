## Documentation

### 1.1 Core Compliance Framework

NoteChain's privacy-first architecture is built on a foundation of technical and legal compliance measures that enforce our "zero data tracking" and "GDPR/CCPA compliance" claims at every level of the application.

#### 1.1.1 Data Processing Agreement (DPA)

**Location:** [https://notechain.tech/legal/dpa](https://notechain.tech/legal/dpa)  
**Version:** 2.1 (Effective January 1, 2024)

**Key Provisions:**

- **Section 4.2:** Explicitly prohibits all subprocessors from storing, processing, or accessing plaintext user data. All data must remain encrypted at all times during processing.
- **Section 6.1:** Documents the zero-knowledge architecture where NoteChain cannot decrypt user content under any circumstances. Encryption keys are exclusively user-controlled.
- **Annex 1:** Complete list of subprocessors with their specific roles:
  - **AWS S3:** Encrypted blob storage only (us-east-1 region)
  - **SendGrid:** Encrypted email delivery for weekly digests
  - **Auth0:** Authentication service (email-only, no profile data)
- **Annex 2:** Technical and organizational measures including:
  - AES-256-GCM encryption for all data at rest
  - Comprehensive access logging with automated anomaly detection
  - Quarterly third-party security audits
  - Employee privacy training requirements

#### 1.1.2 Privacy Impact Assessment (PIA)

**Document ID:** PIA-2024-01 (Updated quarterly)  
**Last Review:** March 15, 2024

**Critical Findings & Mitigations:**

- **Data Minimization:** Only collects email (for authentication) and encrypted blobs (user content). No demographic, location, or behavioral data collected.
- **Default Encryption:** All data fields encrypted client-side before transmission using AES-256-GCM with 96-bit IVs.
- **Retention Policy:**
  - Encrypted blobs: Deleted after 30 days of account inactivity
  - Authentication tokens: Rotated every 7 days
  - Server logs: Retained for 24 hours only (DDoS protection)
- **User Rights Implementation:**
  - One-click GDPR/CCPA data export via web portal (exports encrypted blobs only)
  - Immediate account deletion with cryptographic shredding of all encrypted data
  - DSAR (Data Subject Access Request) portal with 72-hour SLA

#### 1.1.3 Technical Implementation Evidence

```
┌─────────────────────────────────────────────────────────────┐
│               Zero-Tracking Architecture                    │
├─────────────────────────────────────────────────────────────┤
│ Server Infrastructure:                                      │
│ • No logging of IP addresses beyond 24h (DDoS protection)   │
│ • Application logs exclude user identifiers                 │
│ • Metadata limited to: timestamp, action type, device ID    │
│ • All logs encrypted at rest with separate key management   │
│                                                             │
│ Client-Side Enforcement:                                    │
│ • No third-party libraries with tracking capabilities       │
│ • All analytics performed on-device (weekly digest)         │
│ • Network traffic analysis confirms no external calls       │
│   except to NoteChain's encrypted sync endpoints            │
│ • Automatic blocking of known analytics domains             │
└─────────────────────────────────────────────────────────────┘
```

#### 1.1.4 Independent Verification

- **Annual SOC 2 Type II Audit:** Conducted by Cure53, covering security, availability, and confidentiality controls. Latest report: [https://notechain.tech/audits/soc2-2024](https://notechain.tech/audits/soc2-2024)
- **CCPA Compliance Certification:** Verified by PrivacyTrust (Certificate #PT-2024-88732)
- **Transparency Reports:** Published bi-annually showing:
  - Number of data requests received: 0 (2023), 0 (2024 YTD)
  - Number of decryption keys held: 0 (by architectural design)
  - Government data requests: 2 (both returned encrypted blobs only)
  - Employee access violations: 0

#### 1.1.5 User-Facing Compliance Features

- **Privacy Dashboard:** Real-time view of all data stored (encrypted blobs only) with cryptographic hashes for verification
- **Automated DSAR Portal:** Handles GDPR/CCPA requests within 72h, with audit trail
- **Cookie Banner:** Only functional cookies (session management), no tracking cookies
- **Data Processing Registry:** Publicly accessible at [https://notechain.tech/compliance/registry](https://notechain.tech/compliance/registry)

#### 1.1.6 Enforcement Mechanisms

- **Technical Controls:** All server code undergoes privacy compliance review before deployment. Automated scanning for accidental plaintext logging triggers immediate alerts.
- **Contractual Obligations:** All employees sign confidentiality agreements with specific privacy clauses. Subprocessors undergo quarterly compliance reviews.
- **Monitoring:** Real-time monitoring for data exfiltration attempts with automated blocking
- **Training:** Quarterly privacy-by-design training for all engineering staff

**Note:** NoteChain's compliance is architecturally enforced—the zero-knowledge design makes GDPR/CCPA violations technically impossible, as no personal data exists in readable form on our servers.

## 2. Integrated Document Workflow Documentation

### 2.1 End-to-End Offline PDF Processing Workflow

#### 2.1.1 PDF Import (Offline)

**Step A: Source Selection**

1. User taps "Add PDF" from main menu or drags file into application
2. Options presented:
   - Device storage (local files)
   - Camera scan (via device camera)
   - Received encrypted share (from other NoteChain users)
3. **Offline Validation:** App checks for NoteChain encryption header; if missing, encrypts locally using AES-256-GCM with current Device Encryption Key (DEK) before storage

**Step B: Local Encryption Process**

````
PDF Processing Pipeline:
1. PDF binary → Read into secure memory buffer
2. Generate random 96-bit IV for AES-256-GCM
3. Encrypt using DEK (derived from user's master key)
4

## Configuration

This section details the configuration of the NoteChain application, infrastructure, and client environments. All configurations are designed to enforce the core privacy-first, offline-first architecture.

### 3.1 Client Application Configuration

Configuration is managed via a secure, version-controlled `config.json` file bundled with the app. Critical settings are immutable at runtime to prevent security downgrades.

#### 3.1.1 Core Security & Privacy Configuration (`config.json`)
```json
{
  "version": "2.1",
  "security": {
    "encryption": {
      "algorithm": "AES-256-GCM",
      "keyDerivation": "PBKDF2-HMAC-SHA256",
      "iterations": 310000,
      "saltLength": 32,
      "ivLength": 12
    },
    "keyManagement": {
      "localStorageKey": "NC_DEK", // Device Encryption Key
      "keychainService": "tech.notechain.masterkey",
      "biometricUnlock": true, // Configurable by user
      "autoLockTimer": 300 // Seconds of inactivity before re-lock
    },
    "network": {
      "allowedDomains": [
        "sync.notechain.tech:443",
        "auth.notechain.tech:443"
      ],
      "blockedDomains": [
        "*.google-analytics.com",
        "*.facebook.com",
        "*.doubleclick.net",
        "*.amazon-adsystem.com"
      ],
      "forceHTTPS": true,
      "certificatePinning": {
        "sync.notechain.tech": "SHA256=ABC123...",
        "auth.notechain.tech": "SHA256=DEF456..."
      }
    }
  },
  "offline": {
    "cachePolicy": "aggressive",
    "maxCacheSizeMB": 1024, // 1GB local cache
    "syncStrategy": "backgroundOnReconnect",
    "conflictResolution": "clientWinsWithVersioning"
  },
  "features": {
    "pdf": {
      "maxFileSizeMB": 50,
      "allowedActions": ["view", "annotate", "sign", "encrypt"],
      "defaultAnnotationColor": "#FF6B6B",
      "signatureStorage": "localSecureEnclave"
    },
    "analytics": {
      "type": "onDeviceOnly",
      "retentionDays": 7,
      "digestSchedule": "sunday-20:00-local"
    },
    "calendar": {
      "syncProviders": ["ical", "google", "outlook", "apple"],
      "defaultReminderMinutes": 30,
      "maxFutureDays": 365
    }
  }
}
````

#### 3.1.2 Platform-Specific Configuration

**iOS/macOS (Info.plist / Entitlements)**

```xml
<!-- Required for PDF annotation & signing -->
<key>NSCameraUsageDescription</key>
<string>Scan documents to import into your encrypted vault.</string>
<key>NSFaceIDUsageDescription</key>
<string>Unlock your encrypted notes and todos using Face ID.</string>

<!-- App Transport Security - Enforce HTTPS -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>notechain.tech</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
            <false/>
        </dict>
    </dict>
</dict>

<!-- Keychain Access Groups for multi-device sync -->
<key>keychain-access-groups</key>
<array>
    <string>$(AppIdentifierPrefix)tech.notechain.keychain</string>
</array>
```

**Android (AndroidManifest.xml & network_security_config.xml)**

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-feature android:name="android.hardware.fingerprint" android:required="false" />

<!-- Network Security Configuration -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">notechain.tech</domain>
        <pin-set expiration="2025-12-31">
            <pin digest="SHA-256">ABC123...</pin> <!-- Sync pin -->
            <pin digest="SHA-256">DEF456...</pin> <!-- Auth pin -->
        </pin-set>
        <trustkit-config enforcePinning="true" />
    </domain-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

### 3.2 Server Infrastructure Configuration

NoteChain's backend is designed as a "dumb pipe" that only handles encrypted blobs. All configuration enforces this zero-knowledge principle.

#### 3.2.1 Sync Server Configuration (Docker Environment)

````yaml
# docker-compose.yml - Sync Service
version: '3.8'
services:
  sync-api:
    image: notechain/sync:v2.1
    environment:
      - NODE_ENV=production
      - ENCRYPTION_REQUIRED=true
      - MAX_BLOB_SIZE=52428800 # 50MB
      - ALLOW_PLAINTEXT=false
      - LOG_LEVEL=warn
      - LOG_FORMAT=json
      - LOG_EXCLUDE_FIELDS=ip,userAgent,email
    volumes:
      - encrypted_blobs:/data/blobs:ro
      - ./pinned_certs:/etc/ssl/pinned:ro
    networks:
      - internal
    labels:
      - "traefik.http.routers.s

## Deployment Guide

### 4.1.1 Legal & Compliance Verification
Before deploying any NoteChain component, ensure the following compliance documentation is in place:

1. **Signed Data Processing Agreements (DPAs)** with all infrastructure providers
2. **Current Privacy Impact Assessment** (PIA-2024-01 or later) reviewed and approved
3. **SOC 2 Type II Audit Report** from the current year available
4. **Certificate of CCPA Compliance** from PrivacyTrust or equivalent auditor
5. **Transparency Report** updated for the current quarter

**Verification Command:**
```bash
# Check compliance document status
./scripts/compliance-check.sh --validate-all
# Expected output: "All compliance documents current and valid"
````

### 4.1.2 Infrastructure Requirements

NoteChain requires a zero-knowledge infrastructure where servers never handle plaintext data.

#### Minimum Production Specifications:

```
┌──────────────────────┬─────────────────────────────────────────────┐
│ Component            │ Specification                               │
├──────────────────────┼─────────────────────────────────────────────┤
│ Sync Servers (3)     │ 4 vCPU, 8GB RAM, 100GB SSD, Ubuntu 22.04   │
│ Database (PostgreSQL)│ 8 vCPU, 16GB RAM, 500GB SSD, HA cluster    │
│ Object Storage       │ S3-compatible with SSE-256 encryption       │
│ CDN                  │ TLS 1.3 required, no logging enabled        │
│ Firewall             │ WAF with DDoS protection                    │
└──────────────────────┴─────────────────────────────────────────────┘
```

#### Network Security Prerequisites:

- All traffic must use TLS 1.3
- Certificate pinning must be configured
- No outgoing connections to analytics/tracking domains
- IP address logging limited to 24 hours for DDoS protection only

## 4.2 Server Infrastructure Deployment

### 4.2.1 Encrypted Object Storage Setup

**Step 1: Configure S3-Compatible Storage with Server-Side Encryption**

```bash
# Create encrypted bucket with strict policies
aws s3api create-bucket \
  --bucket notechain-encrypted-blobs-$(date +%s) \
  --region us-east-1 \
  --object-lock-enabled-for-bucket

# Apply encryption-at-rest policy
cat > encryption-policy.json << EOF
{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }
  ]
}
EOF

aws s3api put-bucket-encryption \
  --bucket notechain-encrypted-blobs \
  --server-side-encryption-configuration file://encryption-policy.json

# Apply zero-logging policy
aws s3api put-bucket-logging \
  --bucket notechain-encrypted-blobs \
  --bucket-logging-status '{}'  # Explicitly disable logging
```

**Step 2: Deploy Sync Server with Docker**

Create `docker-compose.production.yml`:

```yaml
version: '3.8'
services:
  sync-api:
    image: notechain/sync:v2.1
    container_name: notechain-sync
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - ENCRYPTION_REQUIRED=true
      - ALLOW_PLAINTEXT=false
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_BUCKET=${S3_BUCKET}
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@db:5432/notechain
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=warn
      - LOG_FORMAT=json
      - LOG_EXCLUDE_FIELDS=ip,userAgent,email,requestBody
    volumes:
      - ./pinned_certs:/etc/ssl/pinned:ro
      - ./config/blocked_domains.txt:/app/blocked_domains.txt:ro
    ports:
      - '3001:3001'
    networks:
      - notechain-net
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - 'traefik.http.routers.sync.rule=Host(`sync.notechain.tech`)'
      - 'traefik.http.routers.sync.tls=true'
      - 'traefik.http.routers.sync.tls.certresolver=letsencrypt'
      - 'traefik.http.services.sync.loadbalancer.server.port=3001'

  db:
    image: postgres:15-alpine
    container_name: notechain-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=notechain
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASS}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    networks:
      - notechain-net

  traefik:
    image: traefik:v2.10
    container_name: notechain-traefik
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./config/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./config/dynamic.yml:/etc/traefik/dynamic.yml:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - notechain-net

networks: not
```
