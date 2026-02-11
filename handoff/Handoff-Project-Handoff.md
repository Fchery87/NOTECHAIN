## Project Summary

NoteChain is a **privacy-first, all-in-one productivity suite** designed for users who prioritize data sovereignty and reject surveillance-based business models. It consolidates five critical functions—task management, encrypted note-taking, PDF workflow, calendar integration, and personal analytics—into a single, offline-first application secured with military-grade, end-to-end encryption. The project's foundational principle is **"Zero-Knowledge Productivity,"** where all user data is encrypted on the client device, and the server never has access to plaintext information.

## 2.0 Technical Architecture Overview

The application follows a **modular, multi-platform architecture** with a strong emphasis on client-side processing and secure synchronization.

### 2.1 High-Level Architecture Pattern: **Supabase-Backed Encrypted Sync Engine**

- **Core:** Implements a Conflict-Free Replicated Data Type (CRDT) model for offline-first data integrity.
- **Sync Flow:** `Local Encrypted Store -> Encrypted Delta Packets -> Supabase Realtime/WebSocket -> Target Device -> Local Decryption & Merge`.
- **Server Role:** Supabase PostgreSQL with Row Level Security (RLS) and Supabase Realtime acts as encrypted data relay. No decryption capability server-side. Authentication handled by Supabase Auth (JWT).
- **Package Management:** Bun workspaces for monorepo management, providing 10x faster installs and native TypeScript support.

### 2.2 Project Structure & Key Modules

The codebase is organized into domain-driven modules that reflect the core product features.

```
notechain/
├── apps/
│   ├── mobile/                 # React Native (iOS & Android)
│   ├── web/                    # Next.js / React PWA
│   └── desktop/                # Electron wrapper for Mac/Windows/Linux
├── packages/                   # Shared internal libraries
│   ├── core-crypto/            # AES-256-GCM, key derivation, key management
│   ├── data-models/            # TypeScript interfaces for Note, Todo, PDFAnnotation, etc.
│   ├── sync-engine/            # CRDT logic, delta creation, conflict resolution
│   ├── local-db/               # Abstraction over SQLite (mobile/desktop) & IndexedDB (web)
│   └── analytics-engine/       # On-device analytics processing (weekly digest logic)
├── services/
│   ├── relay-server/           # Node.js + PostgreSQL (stores only encrypted blobs)
│   └── email-digest/           # Serverless function (triggers device-side processing)
└── docs/
    ├── security-audit/         # Third-party audit reports
    └── compliance/             # GDPR & CCPA data flow documentation
```

### 2.3 Critical Technical Files & Components

- **`/packages/core-crypto/src/keyManager.ts`**: **The most critical security file.** Handles generation, secure storage (using platform Keychain/Keystore), and rotation of the user's master encryption key. Implements `deriveItemKey()` for per-item encryption.
- **`/packages/sync-engine/src/crdt.ts`**: Implements the core sync algorithm (`merge()` function) ensuring data consistency across devices after periods of offline work.
- **`/apps/mobile/src/pdf/annotation/SignatureCanvas.tsx`**: Handles touch/stylus input for capturing legally valid signatures directly onto PDFs, with vector path storage.
- **`/packages/analytics-engine/src/weeklyDigestGenerator.ts`**: Contains all logic for processing local task completion data, identifying patterns, and generating the JSON payload for the weekly email. **Runs entirely on the user's device.**
- **`/services/relay-server/src/routes/v1/upload.ts`**: Endpoint that accepts only base64-encoded, encrypted data packets. Includes validation to reject unencrypted or malformed payloads.

## 3.0 Data Flow & Security Model

1.  **Data Creation:** All user data (note text, todo item, PDF annotation) is serialized and encrypted locally using **AES-256-GCM** with a key derived from the user's master key.
2.  **Storage:** Encrypted data (ciphertext + IV + auth tag) is saved to the local device database.
3.  **Synchronization:** When online, the sync engine packages encrypted deltas and pushes them to the relay server via an authenticated, TLS-secured channel.
4.  **Server Processing:** The relay server stores the encrypted blob, associates it with the user's opaque ID, and makes it available to other registered devices. **No decryption occurs.**
5.  **Cross-Platform Access:** Other devices pull down encrypted deltas, decrypt them locally using the user's replicated master key, and merge them into the local CRDT state.

## 4.0 Key Technical Dependencies

- **Cryptography:** `libsodium-wrappers` (web/Tauri) and `react-native-sodium` (native modules) for reliable, audited crypto primitives with AES-256-GCM support.
- **Local Database:** `react-native-mmkv` (mobile), `dexie.js` (web), Tauri Storage API (desktop) for encrypted offline storage.
- **PDF Processing:** `react-native-pdf` (mobile) and `pdf-lib` (web/desktop) for rendering, annotation, and signing.
- **Calendar Sync:** `expo-calendar` (iOS/Android) and platform-specific APIs (Google Calendar API, Apple EventKit, Microsoft Graph) via secure OAuth flows.
- **State Management:** Zustand for lightweight, modular client state shared across platforms.
- **Supabase Client:** `@supabase/supabase-js` for database, auth, real-time, and storage interactions.
- **Package Manager:** Bun 1.0+ for all dependency management, script execution, and monorepo workspaces.

## 5.0 Development & Compliance Notes

- **Audit Trail:** The `docs/security-audit/` directory must contain all third-party audit reports. **No production deployment should occur without a current audit.**
- **Privacy by Design:** The architecture map in `docs/compliance/data-flow.drawio` visually demonstrates the zero-knowledge design to regulators and users.
- **Build Scripts:** Use `npm run build:audit` to generate a software bill of materials (SBOM) for each release, crucial for transparency.

## 6.0 Handoff Priorities for Development Team

1.  **Security First:** Any modification to the `core-crypto` or `sync-engine` packages requires peer review + security lead sign-off.
2.  **Offline Assumption:** All feature development must be tested in airplane mode. The local DB

## Setup Guide

This guide provides detailed instructions for setting up the complete NoteChain development environment. Given the project's emphasis on **privacy, offline-first operation, and cross-platform compatibility**, the setup involves configuring multiple interconnected systems. Follow these steps sequentially.

### 7.1 Prerequisites & System Requirements

Ensure your development machine meets the following requirements:

- **Operating System:** macOS (recommended for iOS/Android/Desktop), Linux, or Windows (with WSL2 for optimal experience).
- **Bun Runtime & Package Manager:** Bun **1.0+** for all dependency management and script execution. Bun is Node.js compatible and requires no separate npm installation.
  ```bash
  # Verify installation
  bun --version # Should be >= 1.0
  ```
- **Git:** Latest stable version.
- **Mobile Development (Required for iOS/Android):**
  - **iOS:** A macOS machine with Xcode **15.0+** and command line tools installed.
  - **Android:** Android Studio **2023.1.1+** with the Android SDK (API Level 33/34) and a configured emulator or physical device.
- **Database:** Docker (recommended) for running the PostgreSQL instance for the relay server locally.

### 7.2 Repository & Initial Setup

1.  **Clone the Repository:**

    ```bash
    git clone <repository-url>
    cd notechain
    ```

2.  **Install Root Dependencies:** The project uses a monorepo managed by `bun` workspaces. Install dependencies from the root.
    ```bash
    bun install
    ```
    _This installs dependencies for all `apps/` and `packages/` using Bun's fast package manager._

### 7.3 Core Cryptographic Module Setup (`packages/core-crypto`)

**This is the most sensitive part of the setup. The build process for native crypto modules is platform-specific.**

1.  **Navigate and Build:**

    ```bash
    cd packages/core-crypto
    npm run build:native
    ```

    This script compiles the `libsodium` native bindings (`sodium-native`). On macOS/Linux, ensure you have `gcc` and `make`. On Windows, this must be run within WSL2.

2.  **Verify Installation:** Run the unit tests to ensure cryptographic functions are operational.
    ```bash
    npm test
    ```
    **Expected Output:** All tests in `keyManager.test.ts` and `cryptoOps.test.ts` should pass. A successful test run confirms your environment can generate, derive, and encrypt/decrypt using AES-256-GCM.

### 7.4 Local Development Database & Supabase Setup

Supabase provides managed PostgreSQL, authentication, real-time sync, and storage. For local development, we use Supabase CLI.

1.  **Install Supabase CLI:**

    ```bash
    bun install -g supabase
    ```

2.  **Start Local Supabase Instance:**

    ```bash
    cd supabase
    supabase start
    ```

    This starts a local Supabase instance with PostgreSQL, Auth, Realtime, and Storage. The API URL will be `http://localhost:54321`.

3.  **Configure Environment:** Copy example environment file and configure it. **Never commit `.env` files.**

    ```bash
    cp apps/mobile/.env.example apps/mobile/.env
    cp apps/web/.env.example apps/web/.env
    ```

    Edit `.env` files. For local development, use the local Supabase instance:

    ```bash
    # apps/mobile/.env
    SUPABASE_URL="http://localhost:54321"
    SUPABASE_ANON_KEY="your-local-anon-key-from-supabase-start"
    ENCRYPTION_ALGORITHM="AES-256-GCM"
    KEY_DERIVATION_ITERATIONS=310000
    BIOMETRIC_UNLOCK_ENABLED=true
    ```

4.  **Apply Database Migrations:**

    ```bash
    bun run supabase:push
    ```

    This applies the SQL migrations found in `supabase/migrations/` directory, creating the database schema with Row Level Security.

5.  **Generate TypeScript Types:**
    ```bash
    bun run supabase:generate
    ```
    This generates TypeScript types from your database schema for type-safe database queries.

### 7.5 Mobile App Setup (`apps/mobile`)

The mobile app is built with React Native. It requires the most platform-specific tooling.

1.  **Install iOS Dependencies (macOS only):**

    ```bash
    cd apps/mobile
    bun install
    bun x pod-install
    ```

    _This installs native iOS dependencies (including `react-native-sodium`) defined in the `Podfile`. The `bun x` prefix runs native binaries._

2.  **Configure Environment Variables:** Create a mobile-specific `.env` file.

    ```bash
    cp .env.example .env.local
    ```

    Set the Supabase URL and any API keys for calendar services (use dummy keys for local dev):

    ```
    SUPABASE_URL="http://localhost:54321"
    SUPABASE_ANON_KEY="your-local-anon-key"
    GOOGLE_OAUTH_CLIENT_ID_IOS="dummy-key-for-dev"
    ```

3.  **Start the Metro Bundler:** In a **separate terminal**, from the `apps/mobile` directory:

    ```bash
    bun start
    ```

    Keep this process running.

4.  **Run on a Simulator/Emulator:**
    - **iOS:** `bun run ios` (requires macOS and Xcode).
    - **Android:** `bun run android` (requires Android Studio and a running emulator or connected device).

    **Critical First-Run Test:** On the app's first launch, it should generate a master encryption key and store it in the platform's secure storage (iOS Keychain/Android Keystore). Check the debug logs for `"[KeyManager] Master key secured."`

### 7.6 Web App Setup (`apps/web`)

The web app is a Next.js PWA and is managed by Bun.

1.  **Navigate and Run:**

    ```bash
    cd apps/web
    bun run dev
    ```

    The application will start on `http://localhost:3000`.

2.  **Test Offline-First & IndexedDB:** Open the browser's Developer Tools (F12

## Next Steps

With the development environment fully configured, the following steps outline the critical path to advance the NoteChain project from a functional codebase to a secure, market-ready product. These priorities are sequenced to mitigate risk, validate core technical assumptions, and build towards the public launch.

### 8.1 Immediate Priorities (Next 2-4 Weeks)

These steps are foundational and must be completed before any public-facing beta.

1.  **Complete End-to-End Encryption (E2EE) Audit & Verification:**
    - **Action:** Conduct an internal security review focused on the cryptographic flow from `packages/core-crypto` through the relay server. Create and execute a comprehensive test suite that validates:
      - No plaintext data (notes, todos, PDF metadata) is ever transmitted to the relay server.
      - Master key derivation and storage on mobile (`react-native-sodium`/Keychain/Keystore) and web (IndexedDB with secure key wrapping) is platform-secure.
      - The sync protocol correctly handles conflict resolution for encrypted blobs.
    - **Deliverable:** A formal "E2EE Implementation Report" to be used as the basis for the upcoming third-party audit.

2.  **Implement Critical Offline-First Edge Cases:**
    - **Action:** Simulate and harden the application against poor connectivity scenarios. Key tests include:
      - Creating and modifying todos, notes, and PDF annotations while offline, then verifying seamless, conflict-free sync upon reconnection.
      - Handling a "first open" scenario with no internet connection (the app must be fully functional).
      - Testing the sync queue resilience after app crashes or device restarts during a sync operation.
    - **Deliverable:** A passing suite of integration tests for the offline sync engine (`packages/sync-engine`).

3.  **Finalize the PDF Signing & Annotation Module:**
    - **Action:** This is a key differentiator. Complete the integration of the native PDF renderer with the touch/stylus signature capture and AI-powered highlighting feature (e.g., using a lightweight on-device model or heuristic).
    - **Deliverable:** A fully functional, offline-capable PDF module within the mobile app that can sign, annotate, and save encrypted PDFs locally.

### 8.2 Medium-Term Milestones (Pre-Launch, 1-3 Months)

These steps prepare the product for a controlled beta release and address core business logic.

4.  **Develop the On-Device Productivity Intelligence Engine:**
    - **Action:** Build the analytics module described in the core proposition. All logic for generating weekly insights ("peak productivity times," "burnout risk") **must run locally**. Develop the system that composes the weekly email digest using only locally analyzed data.
    - **Deliverable:** A functional `ProductivityInsightService` that operates entirely within `packages/core-crypto` or a new `packages/analytics` module, with zero external API calls for data processing.

5.  **Initiate Third-Party Security Audit:**
    - **Action:** Engage a reputable cybersecurity firm (e.g., Cure53, Trail of Bits) specializing in cryptography and application security. Provide them with the "E2EE Implementation Report," full source code, and access to a test build.
    - **Deliverable:** A published security audit report. This document is a non-negotiable marketing and trust asset for the **Privacy-First Architecture** promise.

6.  **Build the Monetization & Subscription Gate:**
    - **Action:** Integrate a subscription management platform (e.g., RevenueCat, Adapty) to handle the **Free**, **Pro ($4.99/mo)**, and **Premium Add-ons** tiers. Implement the device limit (1 vs. 5) and feature flags (PDF signing, weekly reports) based on subscription status.
    - **Deliverable:** A fully integrated purchase flow on iOS, Android, and Web, with entitlements correctly syncing across devices via the user's encrypted profile.

### 8.3 Launch Preparation & Scaling (3-6 Months)

These steps focus on go-to-market readiness and infrastructure.

7.  **Execute a Closed Beta Program:**
    - **Action:** Recruit beta testers from the target audience (privacy advocates, students, freelancers) via waitlist or community outreach (e.g., relevant Reddit communities, Hacker News). Focus on collecting feedback on UX, performance, and clarity of the privacy value proposition.
    - **Deliverable:** A refined v1.0 based on qualitative feedback, bug reports, and performance metrics from the beta group.

8.  **Prepare Production Infrastructure:**
    - **Action:** Harden the relay server for production. This includes:
      - Setting up a PostgreSQL cluster with automated backups.
      - Configuring the relay server for horizontal scaling (stateless by design).
      - Implementing rigorous logging (without capturing plaintext user data) and monitoring.
      - Establishing a CI/CD pipeline for automated testing and deployment.
    - **Deliverable:** A production-ready deployment in a cloud provider (e.g., AWS, GCP) with infrastructure-as-code (Terraform) and a disaster recovery plan.

9.  **Develop Launch Content & Marketing Materials:**
    - **Action:** Create the foundational content for the **"Privacy Manifesto"** go-to-market strategy. Draft the launch blog post, create explainer videos highlighting the integrated workflow (todo → note → PDF sign → calendar), and prepare the messaging that directly contrasts NoteChain's "trust model" with competitors' data harvesting.
    - **Deliverable:** A complete content calendar and asset library for launch week, targeted at the communities where **privacy-conscious professionals** congregate.

### 8.4 Post-Launch & Evolution

10. **Pursue Strategic Partnerships:**
    - **Action:** Post-launch, initiate technical integrations with partners like **Mullvad** or **ProtonVPN** to explore bundled offerings or co-marketing. These partnerships validate and amplify the core privacy brand.
    - **Deliverable:** At least one live partnership integration or co-marketing campaign within 6 months of public launch.

11. \*\*Roadmap:
