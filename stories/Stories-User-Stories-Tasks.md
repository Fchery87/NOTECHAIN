## Technology Stack Overview

NoteChain uses a unified cross-platform architecture:

- **Mobile (iOS/Android):** React Native 0.73+ with Expo Router for navigation and native modules
- **Web:** Next.js 14 with App Router, React Server Components, and PWA support
- **Desktop:** Tauri 2.0 with Rust backend for native file system access
- **Package Manager:** Bun 1.0+ for dependency management and scripting
- **Backend:** Supabase (PostgreSQL 15, Auth, Realtime, Storage) with Row Level Security
- **Local Storage:** React Native MMKV (mobile), Dexie.js (web), Tauri storage API (desktop)
- **Cryptography:** libsodium via react-native-sodium and libsodium-wrappers for AES-256-GCM

## Epic Overview

This document outlines the major development epics for the NoteChain project. Each epic represents a cohesive body of work that delivers a core piece of value, directly supporting our mission to build an all-in-one, privacy-first productivity powerhouse. The epics are structured to realize the key differentiators, satisfy the target audience, and establish the foundation for our aggressive conversion revenue model.

## Epic 1: Foundation & Privacy Architecture

**Primary Goal:** Establish the unbreakable, trust-based foundation that is NoteChain's core competitive advantage.

- **Description:** This epic encompasses the development of the cryptographic backbone and data sovereignty model. It ensures every piece of user data (notes, todos, PDFs, analytics) is encrypted with AES-256-GCM on the user's device before any storage or sync occurs. The user's private key never leaves their control.
- **Relation to Project Goals:**
  - **Core Proposition:** Directly enables the "military-grade end-to-end encryption and zero data tracking" promise.
  - **Key Differentiator:** Delivers the "Privacy-First Architecture" and is fundamental for "GDPR/CCPA compliance."
  - **Target Audience:** Critical for attracting **privacy advocates, security-conscious professionals, and therapists/counselors**.
  - **Competitive Advantage:** Creates the technical and trust moat against competitors like Notion and Evernote.

## Epic 2: Unified Core Applications

**Primary Goal:** Build the integrated, offline-first user experience that unifies the five core productivity functions.

- **Description:** This epic delivers the main user-facing modules: Intelligent Todo Manager, Encrypted Note-Taking, and Integrated PDF Viewer/Annotator/Signer. Focus is on a beautiful, consistent UI/UX across all modules, with deep functional integration (e.g., creating a todo from a note, attaching a PDF to a calendar event).
- **Relation to Project Goals:**
  - **Core Proposition:** Realizes the "all-in-one" and "offline-first" promises. The PDF signing capability is a key part of the "integrated document workflow" for freelancers and professionals.
  - **Key Differentiator:** Enables "Offline-First Design" and the "Integrated Document Workflow."
  - **Revenue Model:** The basic versions of these apps form the **Free Tier**, while advanced features (PDF signing, advanced search) are gated for **Pro** conversion.
  - **Target Audience:** Serves the primary needs of **students, freelancers, and professionals**.

## Epic 3: Smart Sync & Integration Engine

**Primary Goal:** Enable seamless, encrypted multi-device workflow and calendar connectivity without compromising privacy.

- **Description:** This epic builds the conflict-resolution sync engine that works across iPhone, iPad, Mac, Android, and Web using the user's encryption keys. It also develops the secure, token-based connectors for **Smart Calendar Sync** with Google, Outlook, and Apple Calendar, ensuring todo deadlines appear externally without exposing plaintext data.
- **Relation to Project Goals:**
  - **Core Proposition & Differentiator:** Delivers "Multi-Device Sync (Encrypted)" and "Smart Calendar Sync."
  - **User Experience:** Essential for the "start on phone, continue on laptop" seamless workflow.
  - **Revenue Model:** Multi-device sync is a key **Pro** tier feature, driving upgrade incentives.

## Epic 4: On-Device Intelligence & Analytics

**Primary Goal:** Provide valuable personal insights and automation while staunchly upholding the privacy-first principle.

- **Description:** This epic develops the on-device analytics engine that processes todo completion, note creation, and calendar patterns to generate the **Weekly Productivity Intelligence** digest. It also includes the AI-powered features for PDF highlighting and "focus time" recommendations, with all computation occurring locally on the user's device.
- **Relation to Project Goals:**
  - **Key Differentiator:** This is the complete realization of "Personal Productivity Intelligence." The "AI-powered" features are explicitly built without data exfiltration.
  - **Revenue Model:** Weekly reports are a **Pro** tier feature. Advanced analytics can be a **Premium Add-on**.
  - **Target Audience:** Provides actionable value for all users, particularly **freelancers and students** seeking to optimize their output.

## Epic 5: Platform Launch & Monetization Stack

**Primary Goal:** Successfully deploy the application across all target platforms and implement the tiered revenue model.

- **Description:** This epic covers the final packaging, store submissions (iOS App Store, Google Play), and web deployment. It also includes building the in-app purchase and subscription management system for the **Free, Pro, and Premium Add-on** tiers, including logic for device limits and feature gating.
- **Relation to Project Goals:**
  - **Go-to-Market:** Enables the "Launch with iOS/Android + Web simultaneously" strategy.
  - **Revenue Model:** Directly implements the **Aggressive Conversion** model. The structure of the free tier is designed to create the viral funnel, while Pro and Add-ons capture value.
  - **Unit Economics:** The technical implementation of this epic directly enables the projected conversion rates and ARR.

## Epic 6: Security, Compliance & Transparency

**Primary Goal:** Validate, certify, and communicate the security integrity of the platform to build market trust.

- **Description:** This epic manages the third-party security audit process, the creation of public-facing transparency reports, and the implementation of all compliance tooling for data subject requests (DSAR) under GDPR/CCPA. It also encompasses the development of public documentation on the encryption model.
- **Relation to Project Goals:**
  - **Key Differentiator:** Executes on "Full transparency with third-party security audits (published annually)."
  - **Marketing:** Provides the critical, verifiable evidence for content marketing like "The Privacy Manifesto" and is key for **partnerships with privacy-focused VPNs and blogs**.
  - **Competitive Advantage:** Formalizes our trust advantage over closed-source or data-harvesting competitors.

## Inter-Epic Dependencies

The epics must be executed with the following dependencies in mind:

1.  **Epic 1 (Foundation)** is a prerequisite for all data-related work in Epics 2, 3

## User Stories

This section details the specific, user-centric requirements for the NoteChain application. Each story follows the format: **As a [type of user], I want [goal], so that [benefit/value].** Acceptance Criteria (AC) define the conditions that must be met for the story to be considered complete, ensuring alignment with our core proposition of privacy, integration, and offline-first design.

---

### Epic 1: Foundation & Privacy Architecture

**US-1.1: Initial Encryption Setup**

- **As a** new, privacy-conscious user,
- **I want** to create a master password and have a unique encryption key generated on my device during onboarding,
- **so that** I am the sole owner of my encryption key and all my data is protected from the moment of first use.
- **Acceptance Criteria:**
  - AC1: Upon first launch, the user is guided through a mandatory master password creation screen.
  - AC2: The master password is used to generate and encrypt a local AES-256 key (the Data Encryption Key) using a key derivation function (e.g., Argon2id).
  - AC3: The encrypted Data Encryption Key is stored locally. The plaintext master password and plaintext Data Encryption Key are **never** persisted to disk or transmitted over the network.
  - AC4: A clear, non-technical explanation is presented, stating: "Your key never leaves this device. NoteChain servers cannot read your notes, todos, or files."

**US-1.2: Transparent Security Model**

- **As a** security-savvy professional (e.g., therapist, journalist),
- **I want** to easily access and understand the technical details of NoteChain's encryption model and audit history,
- **so that** I can independently verify the privacy claims before entrusting the app with sensitive information (e.g., client notes, source details).
- **Acceptance Criteria:**
  - AC1: A "Security & Transparency" section exists within the app settings.
  - AC2: This section contains a link to the latest third-party security audit report (PDF).
  - AC3: It includes a simplified, bullet-point explanation of the encryption flow (data encrypted on-device with AES-256-GCM before sync).
  - AC4: It provides a mechanism to view the app's current version and link to a public changelog that highlights security updates.

---

### Epic 2: Unified Core Applications

**US-2.1: Offline-First Note Creation**

- **As a** student on a flight with no internet,
- **I want** to create, edit, and format detailed class notes (with headings, lists, and images) seamlessly,
- **so that** my workflow is uninterrupted, and I am confident all data is saved locally and will sync automatically when I reconnect.
- **Acceptance Criteria:**
  - AC1: The note editor is fully functional (create, edit, format, insert images) with airplane mode enabled.
  - AC2: All changes are auto-saved to the local encrypted database immediately.
  - AC3: A subtle, non-intrusive "Offline - Changes saved locally" indicator is visible in the note editor.
  - AC4: Upon reconnecting to the internet, edited notes are synced to the user's other devices without manual intervention.

**US-2.2: Todo from Note Context**

- **As a** freelancer managing a project,
- **I want** to highlight text within a project note and create a linked todo item directly from that context,
- **so that** I can break down complex notes into actionable tasks without switching apps or losing reference.
- **Acceptance Criteria:**
  - AC1: In the note editor, text selection reveals an overflow menu with a "Create Todo" option.
  - AC2: Selecting "Create Todo" opens a pre-populated todo draft with the selected text as the title and a deep link back to the source note.
  - AC3: The created todo appears in the main todo list with a visual icon indicating it is linked to a note.
  - AC4: Clicking the link icon on the todo opens the source note at the relevant section.

**US-2.3: Private PDF Signing**

- **As a** remote worker needing to sign a confidential contract,
- **I want** to import a PDF, add my signature via touch/stylus, and save the signed document,
- **so that** I can complete legally binding documents quickly without printing, scanning, or uploading the sensitive file to a third-party e-sign service.
- **Acceptance Criteria:**
  - AC1: User can import a PDF from device storage or camera into NoteChain.
  - AC2: In PDF annotation mode, a "Sign" tool is available (Pro feature gate applied).
  - AC3: The Sign tool allows drawing a signature or selecting a pre-saved one.
  - AC4: The signature is placed as a flattened annotation on the PDF. The final, signed PDF is saved as an encrypted note/attachment within NoteChain.

---

### Epic 3: Smart Sync & Integration Engine

**US-3.1: Encrypted Cross-Device Sync**

- **As a** user with an iPhone and a Mac,
- **I want** to create a todo on my phone during my commute and see it instantly appear on my laptop when I sit down at my desk,
- **so that** I have a seamless, continuous workflow across all my devices without thinking about sync.
- **Acceptance Criteria:**
  - AC1: User creates a todo on Device A (offline or online).
  - AC2: User opens NoteChain on Device B (logged into the same account, online). The new todo appears in the list within 30 seconds without a manual refresh.
  - AC3: All data transmitted during sync is encrypted end-to-end (the server receives only ciphertext).
  - AC4: Editing the same note on both devices while offline results in a conflict that is resolved cleanly upon sync, with the user prompted to choose a version or merge.

\*\*US-3.2: Privacy-Preserving Calendar Link

## Technical Tasks

This section decomposes the defined user stories into specific, actionable technical implementation tasks. Tasks are grouped by epic and subsystem, with clear dependencies to guide development sequencing. The core technical pillars—**Offline-First Data Layer**, **End-to-End Encryption**, and **Cross-Platform Sync**—are foundational and must be prioritized.

---

### Epic 1: Foundation & Privacy Architecture

**Subsystem: Cryptography & Key Management**

- **TT-1.1.1: Implement Core Cryptographic Primitives**
  - **Description:** Integrate audited libraries for AES-256-GCM encryption/decryption and the Argon2id key derivation function. Create a secure, abstracted `CryptoService` module.
  - **Dependencies:** None (Foundation).
  - **Acceptance Criteria:**
    - Unit tests verify correct encryption and decryption cycles for arbitrary data.
    - Argon2id parameters (time, memory, parallelism) are configured to provide strong security without excessive UI lag.
    - No plaintext secrets are logged or stored in memory longer than necessary.

- **TT-1.1.2: Design & Implement Key Generation & Storage Flow**
  - **Description:** Build the onboarding sequence for US-1.1. Create a `KeyManager` class responsible for generating the master Data Encryption Key (DEK), deriving a key-encryption-key (KEK) from the user's master password, and encrypting the DEK for local storage.
  - **Dependencies:** TT-1.1.1 (Cryptographic Primitives).
  - **Acceptance Criteria:**
    - On first launch, UI flow forces master password creation with strength feedback.
    - The plaintext DEK exists only in volatile memory during the user session and is never transmitted.
    - The encrypted DEK is stored in the device's secure storage (e.g., iOS Keychain, Android Keystore, Web Crypto API).

- **TT-1.2.1: Build Security Transparency UI**
  - **Description:** Create the "Security & Transparency" screen in settings. Implement a static view that displays app version, a simplified graphic of the encryption flow, and links to external resources (audit report, changelog).
  - **Dependencies:** TT-1.1.2 (Key Management).
  - **Acceptance Criteria:**
    - Screen renders correctly on all platforms (mobile, web).
    - Links open the audit PDF and public changelog in the device's default browser.
    - Explanatory text uses clear, non-technical language as specified in US-1.2.

**Subsystem: Local Data Persistence**

- **TT-1.3.1: Select and Configure Encrypted Local Database**
  - **Description:** Configure platform-specific encrypted local databases: React Native MMKV for mobile, Dexie.js (IndexedDB wrapper) for web, and Tauri storage API for desktop. All databases must support robust encryption at rest using the user's DEK. This database will store all user data (notes, todos, PDF metadata, sync logs) locally.
  - **Dependencies:** TT-1.1.1 (Cryptographic Primitives).
  - **Acceptance Criteria:**
    - Database file is encrypted using the user's DEK.
    - Basic CRUD operations for a "Note" entity can be performed offline.
    - Database initialization fails gracefully if the correct DEK is not provided.

---

### Epic 2: Unified Core Applications

**Subsystem: Note Editor & Data Model**

- **TT-2.1.1: Build Offline-First Note Editor Component**
  - **Description:** Develop a rich-text editor component (or integrate a library like TipTap, Quill) that functions without a network connection. All editor actions (keystrokes, formatting) must trigger immediate writes to the local encrypted database.
  - **Dependencies:** TT-1.3.1 (Encrypted Local Database).
  - **Acceptance Criteria:**
    - Editor works with airplane mode enabled (AC1).
    - A `debouncedAutoSave` function persists changes to the DB within 2 seconds of the last edit (AC2).
    - A persistent, subtle "Offline" badge is visible in the app header when offline (AC3).

- **TT-2.1.2: Implement Note-Todo Linkage Data Schema**
  - **Description:** Extend the database schema to support a one-to-many relationship between Notes and Todos. Add a `linkedNoteId` field to the Todo model and a `linkedTodos` array to the Note model.
  - **Dependencies:** TT-1.3.1 (Encrypted Local Database).
  - **Acceptance Criteria:**
    - Database migration script creates the necessary tables/columns.
    - API layer can fetch todos linked to a specific note and vice-versa.

- **TT-2.2.1: Create "Text-to-Todo" UI Action**
  - **Description:** Implement the text selection menu in the note editor. On selection, show a contextual menu with a "Create Todo" action. This action must pre-populate a new todo draft and store the `linkedNoteId` and source text offset.
  - **Dependencies:** TT-2.1.1 (Note Editor), TT-2.1.2 (Linkage Schema).
  - **Acceptance Criteria:**
    - The contextual menu appears consistently across web and mobile (AC1).
    - The created todo draft has the selected text as its title and a valid `linkedNoteId` (AC2).
    - The todo list UI displays a distinct link icon for linked todos (AC3).

**Subsystem: PDF Engine**

- **TT-2.3.1: Integrate PDF Rendering Library**
  - **Description:** Integrate a cross-platform PDF rendering library (e.g., PDF.js for web, PDFKit/PDFView for native mobile). Create a `PDFViewer` component that can display a PDF from an encrypted local file path or binary data.
  - **Dependencies:** TT-1.3.1 (Encrypted Local Database - for storing PDF files).
  - **Acceptance Criteria:**
