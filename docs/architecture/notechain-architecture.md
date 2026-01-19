# NoteChain Architecture Diagrams

This document contains comprehensive architecture diagrams for the NoteChain system, visualizing the data flow, platform components, and monorepo structure as defined in ADR-001 and ADR-002.

## 1. System Overview (C4 Container Diagram)

```mermaid
C4Container
    title NoteChain System Overview

    Person(user, "End User", "Creates, edits, and syncs encrypted notes across devices")

    ContainerDb(rel_db, "PostgreSQL", "Supabase", "Stores encrypted note blobs and metadata")
    Container(rel_auth, "Supabase Auth", "Manages user authentication and sessions")
    Container(rel_realtime, "Supabase Realtime", "Broadcasts sync events to connected clients")
    Container(rel_storage, "Supabase Storage", "Stores encrypted file attachments")

    Container(mobile, "Mobile App", "React Native", "iOS/Android application with native encryption")
    Container(web, "Web App", "Next.js 14", "Progressive web application")
    Container(desktop, "Desktop App", "Tauri", "Cross-platform desktop application")

    Container(shared_core_crypto, "core-crypto", "TypeScript", "Shared encryption/decryption logic")
    Container(shared_data_models, "data-models", "TypeScript", "Shared TypeScript interfaces and types")
    Container(shared_sync_engine, "sync-engine", "TypeScript", "CRDT-based sync logic")
    Container(shared_ui_components, "ui-components", "React", "Shared UI components")

    Rel(user, mobile, "Uses", "HTTPS/WSS")
    Rel(user, web, "Uses", "HTTPS/WSS")
    Rel(user, desktop, "Uses", "HTTPS/WSS")

    Rel(mobile, shared_core_crypto, "Uses", "Local calls")
    Rel(mobile, shared_data_models, "Uses", "TypeScript")
    Rel(mobile, shared_sync_engine, "Uses", "Local calls")
    Rel(mobile, shared_ui_components, "Uses", "React components")

    Rel(web, shared_core_crypto, "Uses", "Local calls")
    Rel(web, shared_data_models, "Uses", "TypeScript")
    Rel(web, shared_sync_engine, "Uses", "Local calls")
    Rel(web, shared_ui_components, "Uses", "React components")

    Rel(desktop, shared_core_crypto, "Uses", "Local calls")
    Rel(desktop, shared_data_models, "Uses", "TypeScript")
    Rel(desktop, shared_sync_engine, "Uses", "Local calls")
    Rel(desktop, shared_ui_components, "Uses", "React components")

    Rel(mobile, rel_db, "Reads/Writes encrypted data", "HTTPS")
    Rel(mobile, rel_auth, "Authenticates", "HTTPS")
    Rel(mobile, rel_realtime, "Subscribes to changes", "WSS")
    Rel(mobile, rel_storage, "Stores attachments", "HTTPS")

    Rel(web, rel_db, "Reads/Writes encrypted data", "HTTPS")
    Rel(web, rel_auth, "Authenticates", "HTTPS")
    Rel(web, rel_realtime, "Subscribes to changes", "WSS")
    Rel(web, rel_storage, "Stores attachments", "HTTPS")

    Rel(desktop, rel_db, "Reads/Writes encrypted data", "HTTPS")
    Rel(desktop, rel_auth, "Authenticates", "HTTPS")
    Rel(desktop, rel_realtime, "Subscribes to changes", "WSS")
    Rel(desktop, rel_storage, "Stores attachments", "HTTPS")
```

## 2. Data Flow Diagram (Note Creation & Sync)

```mermaid
flowchart TD
    subgraph Client["Client Application"]
        UI["User Interface"]
        Store["Local Storage\nMMKV/Dexie"]
        Crypto["core-crypto\nPackage"]
        Sync["sync-engine\nPackage"]
        Models["data-models\nPackage"]
    end

    subgraph Security["Platform Security"]
        KS["iOS Keychain\nor\nAndroid Keystore"]
    end

    subgraph Supabase["Supabase Backend"]
        Auth["Auth Service"]
        DB["PostgreSQL\n(Encrypted Blobs)"]
        RT["Realtime\nSubscriptions"]
        Storage["Object Storage\n(Encrypted Files)"]
    end

    subgraph Remote["Other Clients"]
        RC1["iOS Client"]
        RC2["Android Client"]
        RC3["Web Client"]
        RC4["Desktop Client"]
    end

    %% User creates note
    UI -- "1. User creates note" --> UI
    UI -- "2. Input content" --> Crypto

    %% Encryption flow
    Crypto -- "3. Retrieve master key" --> KS
    KS -- "4. Master key" --> Crypto
    Crypto -- "5. AES-256-GCM encrypt" --> Crypto
    Crypto -- "6. Encrypted note blob" --> Sync

    %% Local sync
    Sync -- "7. CRDT merge" --> Sync
    Sync -- "8. Persist locally" --> Store

    %% Upload to Supabase
    Sync -- "9. Push changes" --> DB
    DB -- "10. Acknowledge" --> Sync
    Sync -- "11. Broadcast event" --> RT

    %% Realtime notification to other clients
    RT -- "12. WSS notification" --> RC1
    RT -- "12. WSS notification" --> RC2
    RT -- "12. WSS notification" --> RC3
    RT -- "12. WSS notification" --> RC4

    %% Other clients sync
    RC1 -- "13. Fetch changes" --> DB
    RC1 -- "14. Decrypt & merge" --> Crypto
    RC2 -- "13. Fetch changes" --> DB
    RC2 -- "14. Decrypt & merge" --> Crypto
    RC3 -- "13. Fetch changes" --> DB
    RC3 -- "14. Decrypt & merge" --> Crypto
    RC4 -- "13. Fetch changes" --> DB
    RC4 -- "14. Decrypt & merge" --> Crypto

    %% File attachments
    UI -- "15. Attach file" --> Crypto
    Crypto -- "16. Encrypt file" --> Crypto
    Crypto -- "17. Upload" --> Storage
    Storage -- "18. Store encrypted" --> Storage
```

## 3. Encryption Data Flow

```mermaid
flowchart LR
    subgraph Encryption["Encryption Flow"]
        subgraph Input["Plaintext Input"]
            Note["Note Content"]
            Attach["File Attachment"]
            Meta["Metadata"]
        end

        subgraph Keys["Key Management"]
            MK["Master Key\n(stored in\nPlatform Security)"]
            DEK["Data Encryption Key\n(derived from\nmaster key)"]
        }

        subgraph Output["Encrypted Output"]
            EncNote["Encrypted Note\nBlob"]
            EncFile["Encrypted\nAttachment"]
            EncMeta["Encrypted\nMetadata"]
        end
    end

    Note -- "1. Encrypt with DEK\n(AES-256-GCM)" --> EncNote
    Attach -- "2. Encrypt with DEK\n(AES-256-GCM)" --> EncFile
    Meta -- "3. Encrypt with DEK\n(AES-256-GCM)" --> EncMeta

    MK -- "4. Key derivation\n(PBKKDF2)" --> DEK
    DEK -- "5. Encrypt data" --> Note
    DEK -- "5. Encrypt data" --> Attach
    DEK -- "5. Encrypt data" --> Meta
```

```mermaid
flowchart LR
    subgraph Decryption["Decryption Flow"]
        subgraph Input["Encrypted Input"]
            EncNote["Encrypted Note\nBlob"]
            EncFile["Encrypted\nAttachment"]
        end

        subgraph Keys["Key Management"]
            MK["Master Key\n(retrieved from\nPlatform Security)"]
            DEK["Data Encryption Key\n(re-derived from\nmaster key)"]
        }

        subgraph Output["Plaintext Output"]
            Note["Note Content"]
            Attach["File Attachment"]
        end
    end

    EncNote -- "1. Retrieve encrypted blob" --> EncNote
    EncFile -- "1. Retrieve encrypted file" --> EncFile

    MK -- "2. Fetch from\nKeychain/Keystore" --> MK
    MK -- "3. Key derivation\n(PBKKDF2)" --> DEK

    DEK -- "4. Decrypt with DEK\n(AES-256-GCM)" --> Note
    DEK -- "4. Decrypt with DEK\n(AES-256-GCM)" --> Attach
```

## 4. Sync Engine Data Flow

```mermaid
flowchart TD
    subgraph Local["Local Client"]
        LocalDB["Local Database\n(MMKV/Dexie)"]
        CRDT["CRDT Operations"]
        Queue["Sync Queue"]
        Crypto["core-crypto"]
    end

    subgraph Network["Network Layer"]
        Supabase["Supabase"]
        Realtime["Realtime"]
    end

    subgraph Remote["Remote Clients"]
        RC["Other Devices"]
    end

    %% Local changes
    LocalDB -- "1. User creates/edits" --> LocalDB
    LocalDB -- "2. Store plaintext" --> LocalDB
    LocalDB -- "3. Queue encrypted blob" --> Queue

    Queue -- "4. Upload to Supabase" --> Supabase
    Supabase -- "5. Persist to PostgreSQL" --> Supabase
    Supabase -- "6. Broadcast event" --> Realtime

    Realtime -- "7. WSS notify" --> RC

    %% Remote changes
    RC -- "8. Upload change" --> Supabase
    Supabase -- "9. Broadcast" --> Realtime
    Realtime -- "10. Notify client" --> Local

    Local -- "11. Fetch encrypted blob" --> Supabase
    Supabase -- "12. Return blob" --> Local

    Local -- "13. Decrypt" --> Crypto
    Crypto -- "14. Return plaintext" --> Local

    Local -- "15. Merge via CRDT" --> CRDT
    CRDT -- "16. Resolve conflicts" --> LocalDB
```

## 5. Platform-Specific Architecture

### 5.1 Mobile App (React Native)

```mermaid
flowchart TD
    subgraph Mobile["Mobile Application - React Native"]
        subgraph UI_Layer["UI Layer"]
            Screens["Screens\n(Home, Editor, Settings)"]
            Components["Shared UI\nComponents"]
            Navigation["React Navigation"]
        end

        subgraph Business["Business Logic"]
            AuthStore["Auth Store\n(Zustand)"]
            NotesStore["Notes Store\n(Zustand)"]
            SyncController["Sync\nController"]
        end

        subgraph Data["Data Layer"]
            LocalDB["MMKV Database"]
            CryptoLib["react-native-sodium"]
            KeyStore["iOS Keychain/\nAndroid Keystore"]
        end

        subgraph Shared["Shared Packages"]
            SharedCrypto["core-crypto"]
            SharedModels["data-models"]
            SharedSync["sync-engine"]
            SharedUI["ui-components"]
        end

        subgraph Network["Network Layer"]
            SupabaseClient["Supabase Client"]
            Realtime["Realtime Subscriptions"]
        end

        Screens -- "User actions" --> AuthStore
        Screens -- "User actions" --> NotesStore
        Components -- "Renders" --> Screens

        AuthStore -- "Auth operations" --> SupabaseClient
        NotesStore -- "CRUD operations" --> SyncController

        SyncController -- "Read/Write" --> LocalDB
        SyncController -- "Encrypt/Decrypt" --> CryptoLib
        SyncController -- "Fetch keys" --> KeyStore

        CryptoLib -- "Native calls" --> SharedCrypto
        LocalDB -- "Type definitions" --> SharedModels
        SyncController -- "Sync logic" --> SharedSync

        SupabaseClient -- "HTTPS/WSS" --> Realtime
    end
```

### 5.2 Web App (Next.js 14)

```mermaid
flowchart TD
    subgraph Web["Web Application - Next.js 14"]
        subgraph UI_Layer["UI Layer"]
            Pages["Pages\n(Route Handlers)"]
            Components["Shared UI\nComponents"]
            PWA["PWA Service\nWorkers"]
        end

        subgraph Business["Business Logic"]
            AuthContext["Auth Context"]
            NotesContext["Notes Context"]
            SyncHook["useSync Hook"]
        end

        subgraph Data["Data Layer"]
            IndexedDB["Dexie.js\n(IndexedDB)"]
            CryptoLib["libsodium-wrappers\n(WASM)"]
            SessionStore["Session Storage"]
        end

        subgraph Shared["Shared Packages"]
            SharedCrypto["core-crypto"]
            SharedModels["data-models"]
            SharedSync["sync-engine"]
            SharedUI["ui-components"]
        end

        subgraph Network["Network Layer"]
            SupabaseClient["Supabase Client"]
            Realtime["Realtime Subscriptions"]
        end

        subgraph SSR["Server Side"]
            SSR["Next.js SSR\n(Auth check)"]
            API["API Routes"]
        end

        Pages -- "User actions" --> AuthContext
        Pages -- "User actions" --> NotesContext
        Components -- "Renders" --> Pages

        AuthContext -- "Auth operations" --> SupabaseClient
        NotesContext -- "CRUD operations" --> SyncHook

        SyncHook -- "Read/Write" --> IndexedDB
        SyncHook -- "Encrypt/Decrypt" --> CryptoLib

        CryptoLib -- "WebAssembly" --> SharedCrypto
        IndexedDB -- "Type definitions" --> SharedModels
        SyncHook -- "Sync logic" --> SharedSync

        SupabaseClient -- "HTTPS/WSS" --> Realtime

        SSR -- "Initial render" --> Pages
        API -- "Backend logic" --> SupabaseClient
```

### 5.3 Desktop App (Tauri 2.0)

```mermaid
flowchart TD
    subgraph Desktop["Desktop Application - Tauri 2.0"]
        subgraph Frontend["Frontend (React)"]
            Screens["React Screens"]
            Components["Shared UI\nComponents"]
        end

        subgraph Bridge["Tauri Bridge"]
            Commands["Tauri Commands"]
            Events["Tauri Events"]
        end

        subgraph Backend["Backend (Rust)"]
            CryptoRust["Rust Crypto\n(libsodium)"]
            StoreRust["Rust Storage"]
            SyncRust["Rust Sync Logic"]
        end

        subgraph Shared["Shared Packages"]
            SharedModels["data-models"]
            SharedSync["sync-engine"]
            SharedUI["ui-components"]
        end

        subgraph Network["Network Layer"]
            SupabaseClient["Supabase Client"]
            Realtime["Realtime Subscriptions"]
        end

        Screens -- "User actions" --> Commands
        Components -- "Renders" --> Screens

        Commands -- "IPC calls" --> Bridge
        Bridge -- "Rust FFI" --> CryptoRust
        Bridge -- "Rust FFI" --> StoreRust
        Bridge -- "Rust FFI" --> SyncRust

        CryptoRust -- "Encrypt/Decrypt" --> StoreRust
        StoreRust -- "Persist" --> LocalStorage["Local Storage"]

        SyncRust -- "Sync logic" --> SupabaseClient
        SupabaseClient -- "HTTPS/WSS" --> Realtime

        StoreRust -- "Type definitions" --> SharedModels
        SyncRust -- "Sync logic" --> SharedSync

        Events -- "Notify frontend" --> Bridge
```

## 6. Monorepo Structure

```mermaid
flowchart TD
    subgraph Root["NoteChain Root"]
        Config["package.json\n(bun workspace)"]
        Lock["bun.lockb"]
        Git[".gitignore\n.git"]
    end

    subgraph Apps["apps/ - Platform Applications"]
        subgraph Mobile["mobile/ - React Native"]
            MobileConfig["package.json"]
            MobileTS["tsconfig.json"]
            MobileSrc["src/\n• screens/\n• components/\n• stores/\n• hooks/"]
        end

        subgraph Web["web/ - Next.js"]
            WebConfig["package.json"]
            WebNext["next.config.js"]
            WebTS["tsconfig.json"]
            WebSrc["src/\n• app/\n• components/\n• lib/"]
        end

        subgraph Desktop["desktop/ - Tauri"]
            DesktopConfig["package.json"]
            DesktopRust["src-tauri/\n• Cargo.toml\n• src/\n• icons/"]
            DesktopSrc["src/\n• components/\n• hooks/"]
        end
    end

    subgraph Packages["packages/ - Shared Libraries"]
        subgraph CoreCrypto["core-crypto/"]
            CryptoConfig["package.json"]
            CryptoTS["tsconfig.json"]
            CryptoSrc["src/\n• keyManager.ts\n• encryption.ts\n• crypto.test.ts"]
        end

        subgraph DataModels["data-models/"]
            ModelsConfig["package.json"]
            ModelsTS["tsconfig.json"]
            ModelsSrc["src/\n• note.ts\n• user.ts\n• sync.ts\n• index.ts"]
        end

        subgraph SyncEngine["sync-engine/"]
            SyncConfig["package.json"]
            SyncTS["tsconfig.json"]
            SyncSrc["src/\n• crdt.ts\n• sync.ts\n• conflict.ts\n• index.ts"]
        end

        subgraph UIComponents["ui-components/"]
            UIConfig["package.json"]
            UITS["tsconfig.json"]
            UISrc["src/\n• Button/\n• Input/\n• Modal/\n• Theme/"]
        end
    end

    subgraph Supabase["supabase/ - Backend"]
        SupabaseConfig["config.toml"]
        Migrations["migrations/\n• 001_*.sql"]
        Functions["functions/\n• edge-functions/"]
        Policies["RLS Policies"]
    end

    subgraph Docs["docs/ - Documentation"]
        ADR["adr/\n• ADR-001.md\n• ADR-002.md"]
        Architecture["architecture/\n• notechain-architecture.md"]
        Guides["guides/\n• setup.md\n• development.md"]
    end

    Root --> Apps
    Root --> Packages
    Root --> Supabase
    Root --> Docs

    Apps --> Mobile
    Apps --> Web
    Apps --> Desktop

    Packages --> CoreCrypto
    Packages --> DataModels
    Packages --> SyncEngine
    Packages --> UIComponents
```

## 7. Database Schema (Supabase)

```mermaid
erDiagram
    users ||--o{ notes : creates
    users ||--o{ encrypted_blobs : owns
    users ||--o{ storage_objects : owns

    notes {
        uuid id PK
        uuid user_id FK
        text encrypted_content
        text encrypted_metadata
        timestamp created_at
        timestamp updated_at
        bigint version
        text last_synced_device
    }

    encrypted_blobs {
        uuid id PK
        uuid user_id FK
        uuid note_id FK
        bytea encrypted_data
        text blob_type
        bigint sequence_number
        timestamp created_at
        jsonb metadata
    }

    storage_objects {
        uuid id PK
        uuid user_id FK
        text bucket_name
        text file_path
        bigint file_size
        text mime_type
        bytea encrypted_checksum
        timestamp created_at
    }

    sync_state {
        uuid id PK
        uuid user_id FK
        text device_id
        text last_synced_at
        bigint sync_version
        jsonb pending_operations
    }
```

## 8. Technology Stack Summary

```mermaid
flowchart TD
    subgraph Frontend["Frontend (Client)"]
        subgraph Platforms["Platforms"]
            Mobile["React Native 0.73+\niOS / Android"]
            Web["Next.js 14\nPWA / SSR"]
            Desktop["Tauri 2.0\nRust / React"]
        end

        subgraph Languages["Languages"]
            TypeScript["TypeScript 5.x"]
            Rust["Rust 1.75+"]
            Swift["Swift (iOS)"]
            Kotlin["Kotlin (Android)"]
        end

        subgraph State["State Management"]
            Zustand["Zustand"]
            ReactQuery["React Query"]
        end
    end

    subgraph Shared["Shared Packages"]
        Crypto["core-crypto\nlibsodium"]
        Models["data-models\nTypeScript"]
        Sync["sync-engine\nCRDT"]
        UI["ui-components\nReact"]
    end

    subgraph Backend["Backend (Supabase)"]
        Database["PostgreSQL 15"]
        Auth["Auth (JWT)"]
        Realtime["Realtime (WSS)"]
        Storage["Storage (S3)"]
    end

    subgraph DevOps["Infrastructure"]
        Bun["Bun 1.0+"]
        Docker["Docker"]
        CI["GitHub Actions"]
    end

    Frontend --> Shared
    Shared --> Backend
    DevOps --> Frontend
    DevOps --> Backend
```

## 9. Security Architecture

```mermaid
flowchart TD
    subgraph Security["Security Layers"]
        subgraph Application["Application Layer"]
            Auth["Authentication\n(Supabase Auth)"]
            Crypto["Encryption\n(core-crypto)"]
            RLS["Row Level Security\n(PostgreSQL)"]
        end

        subgraph Transport["Transport Layer"]
            TLS["TLS 1.3"]
            WSS["WSS (Realtime)"]
        end

        subgraph Platform["Platform Security"]
            Keychain["iOS Keychain"]
            Keystore["Android Keystore"]
            SystemAuth["Desktop System Auth"]
        end
    end

    subgraph Data["Data States"]
        InFlight["In Flight\n(TLS/WSS)"]
        AtRest["At Rest\n(Encrypted)"]
        InMemory["In Memory\n(Decrypted)"]
    end

    Auth -- "Validates" --> Application
    Crypto -- "Encrypts/Decrypts" --> Application
    RLS -- "Enforces access" --> Application

    TLS -- "Secures" --> Transport
    WSS -- "Secures" --> Transport

    Keychain -- "Stores keys" --> Platform
    Keystore -- "Stores keys" --> Platform
    SystemAuth -- "Authenticates" --> Platform

    Application -- "HTTPS" --> InFlight
    Application -- "Encrypted blobs" --> AtRest
    Application -- "Active session" --> InMemory
```

## 10. Offline-First Sync Flow

```mermaid
flowchart TD
    subgraph Local["Local Device"]
        LocalDB["Local Database\n(MMKV/Dexie)"]
        SyncQueue["Sync Queue"]
        Crypto["Encryption"]
    end

    subgraph Cloud["Supabase"]
        PG["PostgreSQL"]
        RT["Realtime"]
    end

    subgraph Remote["Remote Devices"]
        RD["Other Devices"]
    end

    %% Local operations
    LocalDB -- "1. Create/Edit note" --> LocalDB
    LocalDB -- "2. Encrypt & store" --> Crypto
    Crypto -- "3. Store encrypted" --> LocalDB
    LocalDB -- "4. Queue for sync" --> SyncQueue

    %% Online sync
    SyncQueue -- "5. Upload when online" --> PG
    PG -- "6. Persist" --> PG
    PG -- "7. Broadcast" --> RT
    RT -- "8. Notify" --> RD

    %% Offline handling
    SyncQueue -- "9. Queue builds up\n(offline)" --> SyncQueue
    SyncQueue -- "10. Process queue\n(when online)" --> PG

    %% Background sync
    RT -- "11. Periodic check" --> PG
    PG -- "12. Fetch changes" --> RT
    RT -- "13. Merge locally" --> LocalDB

    %% Conflict resolution
    LocalDB -- "14. CRDT merge" --> LocalDB
    LocalDB -- "15. Resolve conflicts" --> LocalDB
```

---

## Diagram Legend

| Symbol          | Meaning                       |
| --------------- | ----------------------------- |
| Rectangular box | Component, service, or module |
| Cylinder        | Database or storage           |
| Parallelogram   | External service or API       |
| Arrows          | Data flow direction           |
| Dotted line     | Optional or conditional flow  |
| Shaded region   | System boundary or layer      |

## Revision History

| Version | Date       | Description                                                |
| ------- | ---------- | ---------------------------------------------------------- |
| 1.0     | 2025-01-19 | Initial architecture diagrams based on ADR-001 and ADR-002 |

## References

- [ADR-001: Technology Stack Selection](../adr/ADR-001-technology-stack.md)
- [ADR-002: React Native Framework Choice](../adr/ADR-002-framework-choice.md)
- [Technical Specifications](../../specs/Specs-Technical-Specifications.md)
