# NoteChain Error Code Taxonomy

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-19  
**Status:** Active  
**Related:** [OpenAPI Specification](./openapi-spec.yaml)

---

## Overview

This document defines the comprehensive error handling taxonomy for the NoteChain API. All errors follow a consistent structure with specific error codes, HTTP status mappings, user-friendly messages, and retry behavior. The error system is designed to balance user experience with security, ensuring that sensitive information is never exposed while providing actionable feedback.

The error taxonomy is organized into five major categories: Authentication (AUTH), Synchronization (SYNC), Cryptography (CRYPT), Storage (STOR), and General (GEN) errors. Each category uses a three-digit suffix starting from 001, allowing for future expansion while maintaining a logical grouping. This structure enables clients to implement category-specific error handling strategies while maintaining consistency across all error responses.

Error codes are designed to be stable identifiers that do not change across API versions. If an error needs to be modified, a new error code will be added rather than changing the semantics of an existing one. This ensures backward compatibility for clients that rely on specific error codes for error handling logic.

---

## Error Code Format

Error codes follow the pattern `XXX-YYY` where:

- `XXX` is a three-letter category prefix (AUTH, SYNC, CRYPT, STOR, GEN)
- `YYY` is a three-digit sequence number starting from 001

This format provides several benefits: the category prefix allows clients to quickly identify the error domain, the numeric suffix provides room for future expansion within each category, and the hyphen separator makes the codes human-readable while remaining machine-parseable.

---

## TypeScript Definitions

### Error Code Enum

```typescript
export enum ErrorCode {
  // ==================== AUTHENTICATION ERRORS ====================

  AUTH_INVALID_CREDENTIALS = "AUTH-001",
  AUTH_TOKEN_EXPIRED = "AUTH-002",
  AUTH_TOKEN_INVALID = "AUTH-003",
  AUTH_DEVICE_LIMIT_EXCEEDED = "AUTH-004",
  AUTH_BIOMETRIC_FAILED = "AUTH-005",
  AUTH_EMAIL_ALREADY_EXISTS = "AUTH-006",
  AUTH_ACCOUNT_LOCKED = "AUTH-007",
  AUTH_REFRESH_TOKEN_INVALID = "AUTH-008",
  AUTH_OAUTH_FAILED = "AUTH-009",

  // ==================== SYNCHRONIZATION ERRORS ====================

  SYNC_CONFLICT_DETECTED = "SYNC-001",
  SYNC_ENCRYPTION_FAILED = "SYNC-002",
  SYNC_QUEUE_FULL = "SYNC-003",
  SYNC_NETWORK_ERROR = "SYNC-004",
  SYNC_VERSION_MISMATCH = "SYNC-005",
  SYNC_DEVICE_NOT_REGISTERED = "SYNC-006",
  SYNC_CONFLICT_RESOLUTION_FAILED = "SYNC-007",
  SYNC_OPERATION_FAILED = "SYNC-008",

  // ==================== CRYPTOGRAPHY ERRORS ====================

  CRYPT_KEY_NOT_FOUND = "CRYPT-001",
  CRYPT_DECRYPTION_FAILED = "CRYPT-002",
  CRYPT_INVALID_NONCE = "CRYPT-003",
  CRYPT_KEY_DERIVATION_FAILED = "CRYPT-004",
  CRYPT_INVALID_KEY_ID = "CRYPT-005",
  CRYPT_INVALID_CIPHERTEXT = "CRYPT-006",
  CRYPT_AUTH_TAG_INVALID = "CRYPT-007",

  // ==================== STORAGE ERRORS ====================

  STOR_QUOTA_EXCEEDED = "STOR-001",
  STOR_BLOB_NOT_FOUND = "STOR-002",
  STOR_UPLOAD_FAILED = "STOR-003",
  STOR_DOWNLOAD_FAILED = "STOR-004",
  STOR_PAYLOAD_TOO_LARGE = "STOR-005",
  STOR_DELETE_FAILED = "STOR-006",

  // ==================== GENERAL ERRORS ====================

  GEN_NETWORK_ERROR = "GEN-001",
  GEN_SERVER_ERROR = "GEN-002",
  GEN_RATE_LIMITED = "GEN-003",
  GEN_INVALID_REQUEST = "GEN-004",
  GEN_FEATURE_NOT_AVAILABLE = "GEN-005",
  GEN_SERVICE_UNAVAILABLE = "GEN-006",
  GEN_INTERNAL_ERROR = "GEN-007",
  GEN_PAYMENT_REQUIRED = "GEN-008",
}
```

### Error Definition Interface

```typescript
export interface ErrorDefinition {
  code: ErrorCode;
  httpStatus: number;
  userMessage: string;
  technicalDetails: string;
  isRetryable: boolean;
  retryAfterMs?: number;
}
```

### Error Response Schema

```typescript
export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  details?: {
    retryAfter?: number;
    conflict?: {
      blob_id: string;
      local_version: number;
      remote_version: number;
      conflict_type: string;
    };
    [key: string]: unknown;
  };
  timestamp: string;
  requestId: string;
}
```

---

## Error Code Catalog

### AUTH-xxx: Authentication Errors

Authentication errors occur when there are issues with user credentials, tokens, or authentication mechanisms. These errors typically require user action to resolve, such as re-authenticating or updating credentials. The system treats authentication errors with higher security scrutiny, implementing rate limiting to prevent brute-force attacks and account lockout mechanisms after repeated failures.

#### AUTH-001: AUTH_INVALID_CREDENTIALS

**HTTP Status:** 401 Unauthorized  
**Retryable:** Yes  
**Retry Delay:** 2000ms

```typescript
const AUTH_INVALID_CREDENTIALS: ErrorDefinition = {
  code: ErrorCode.AUTH_INVALID_CREDENTIALS,
  httpStatus: 401,
  userMessage:
    "Invalid email or password. Please try again or reset your password.",
  technicalDetails:
    "Email hash not found in database or password derivation failed validation",
  isRetryable: true,
  retryAfterMs: 2000,
};
```

**User Experience Guidance:** Display a friendly error message that does not indicate whether the email or password was incorrect. This prevents email enumeration attacks. Consider implementing a "Forgot password?" link after multiple failed attempts. On mobile, consider integrating with the platform's password autofill to reduce entry errors.

**Technical Notes:** The server validates the email hash first before attempting password derivation. This prevents timing attacks that could reveal whether an email exists. Failed attempts are logged for security monitoring but never include the attempted password or derived key.

#### AUTH-002: AUTH_TOKEN_EXPIRED

**HTTP Status:** 401 Unauthorized  
**Retryable:** Yes  
**Retry Delay:** 0ms (immediate refresh recommended)

```typescript
const AUTH_TOKEN_EXPIRED: ErrorDefinition = {
  code: ErrorCode.AUTH_TOKEN_EXPIRED,
  httpStatus: 401,
  userMessage: "Your session has expired. Please sign in again to continue.",
  technicalDetails: "JWT access token has passed its expiration time",
  isRetryable: true,
  retryAfterMs: 0,
};
```

**User Experience Guidance:** Automatically attempt token refresh if a refresh token is available. Only prompt the user to re-authenticate if the refresh fails. Show a subtle indicator that the app is re-authenticating rather than a full login screen when possible.

**Technical Notes:** Access tokens have a 24-hour validity period. Clients should proactively refresh tokens when they are 1 hour from expiration. The server tracks token usage and revokes tokens if suspicious activity is detected.

#### AUTH-003: AUTH_TOKEN_INVALID

**HTTP Status:** 401 Unauthorized  
**Retryable:** Yes  
**Retry Delay:** 0ms

```typescript
const AUTH_TOKEN_INVALID: ErrorDefinition = {
  code: ErrorCode.AUTH_TOKEN_INVALID,
  httpStatus: 401,
  userMessage: "Invalid session. Please sign in again.",
  technicalDetails:
    "JWT token signature verification failed or token malformed",
  isRetryable: true,
  retryAfterMs: 0,
};
```

**User Experience Guidance:** Clear stored credentials and prompt for re-authentication. Check if this error occurs frequently, which may indicate token storage corruption or sync issues across devices.

#### AUTH-004: AUTH_DEVICE_LIMIT_EXCEEDED

**HTTP Status:** 403 Forbidden  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const AUTH_DEVICE_LIMIT_EXCEEDED: ErrorDefinition = {
  code: ErrorCode.AUTH_DEVICE_LIMIT_EXCEEDED,
  httpStatus: 403,
  userMessage:
    "Maximum device limit reached. Please remove an existing device to add a new one.",
  technicalDetails:
    "User has reached maximum allowed devices for their subscription tier",
  isRetryable: false,
};
```

**User Experience Guidance:** Direct users to the Device Management screen where they can review and revoke devices. Show the list of current devices with their last active times. For paid tiers, offer an upgrade option that increases the device limit.

**Technical Details by Tier:**
| Tier | Maximum Devices |
|------|----------------|
| Free | 2 |
| Pro | 5 |
| Team | Unlimited |

#### AUTH-005: AUTH_BIOMETRIC_FAILED

**HTTP Status:** 401 Unauthorized  
**Retryable:** Yes  
**Retry Delay:** 500ms

```typescript
const AUTH_BIOMETRIC_FAILED: ErrorDefinition = {
  code: ErrorCode.AUTH_BIOMETRIC_FAILED,
  httpStatus: 401,
  userMessage:
    "Biometric authentication failed. Please use your password instead.",
  technicalDetails:
    "Biometric proof verification failed or biometric enrollment not found",
  isRetryable: true,
  retryAfterMs: 500,
};
```

**User Experience Guidance:** After 3 biometric failures, automatically prompt for password authentication. Allow users to disable biometric authentication in settings if it consistently fails. On iOS, leverage Face ID's spoilage detection; on Android, use the BiometricPrompt callback to detect spoofing attempts.

#### AUTH-006: AUTH_EMAIL_ALREADY_EXISTS

**HTTP Status:** 409 Conflict  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const AUTH_EMAIL_ALREADY_EXISTS: ErrorDefinition = {
  code: ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
  httpStatus: 409,
  userMessage:
    "An account with this email already exists. Please sign in instead.",
  technicalDetails: "Email hash collision detected during registration attempt",
  isRetryable: false,
};
```

**User Experience Guidance:** Provide a clear "Sign in" link or button. Do not suggest that the user try a different email address, as this reveals that the email is registered. Include a "Forgot password?" option prominently.

#### AUTH-007: AUTH_ACCOUNT_LOCKED

**HTTP Status:** 423 Locked  
**Retryable:** Yes  
**Retry Delay:** 900000ms (15 minutes)

```typescript
const AUTH_ACCOUNT_LOCKED: ErrorDefinition = {
  code: ErrorCode.AUTH_ACCOUNT_LOCKED,
  httpStatus: 423,
  userMessage:
    "Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.",
  technicalDetails:
    "Account locked after 5 consecutive failed authentication attempts",
  isRetryable: true,
  retryAfterMs: 900000,
};
```

**User Experience Guidance:** Show a countdown timer indicating when the lock will expire. Provide a "Contact Support" option for legitimate users who are locked out. Consider offering a "Reset Password" option that can unlock the account earlier.

**Security Policy:** Lockout occurs after 5 failed attempts within 15 minutes. Each successful authentication resets the counter. The lockout duration increases for repeat offenders.

#### AUTH-008: AUTH_REFRESH_TOKEN_INVALID

**HTTP Status:** 401 Unauthorized  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const AUTH_REFRESH_TOKEN_INVALID: ErrorDefinition = {
  code: ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
  httpStatus: 401,
  userMessage: "Session invalidated. Please sign in again.",
  technicalDetails:
    "Refresh token has been revoked, expired, or used previously",
  isRetryable: false,
};
```

**User Experience Guidance:** This error typically indicates that the user has logged out from another device, password was changed, or account was deleted. Clear all local credentials and prompt full re-authentication.

#### AUTH-009: AUTH_OAUTH_FAILED

**HTTP Status:** 400 Bad Request  
**Retryable:** Yes  
**Retry Delay:** 1000ms

```typescript
const AUTH_OAUTH_FAILED: ErrorDefinition = {
  code: ErrorCode.AUTH_OAUTH_FAILED,
  httpStatus: 400,
  userMessage:
    "OAuth authentication failed. Please try again or use a different method.",
  technicalDetails: "OAuth provider returned error or token validation failed",
  isRetryable: true,
  retryAfterMs: 1000,
};
```

**User Experience Guidance:** Provide a fallback to email/password authentication. Log the specific OAuth error for debugging while showing a generic message to the user. Common causes include revoked permissions, expired tokens, or OAuth service outages.

---

### SYNC-xxx: Synchronization Errors

Synchronization errors relate to the CRDT-based sync engine that enables multi-device collaboration. These errors are particularly important because they can affect data consistency across devices. The sync system uses optimistic concurrency control, and conflicts are expected to occur in normal operation. The error handling strategy prioritizes data integrity while providing clear paths for conflict resolution.

#### SYNC-001: SYNC_CONFLICT_DETECTED

**HTTP Status:** 409 Conflict  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const SYNC_CONFLICT_DETECTED: ErrorDefinition = {
  code: ErrorCode.SYNC_CONFLICT_DETECTED,
  httpStatus: 409,
  userMessage:
    "Another device made changes to this item. Choose which version to keep.",
  technicalDetails: "CRDT version conflict detected during sync push operation",
  isRetryable: false,
};
```

**User Experience Guidance:** This is not an error condition but an expected outcome of multi-device editing. Present a conflict resolution UI that shows both versions clearly. Allow users to choose between versions or merge when possible. Include metadata like edit timestamps and device names to help users decide.

**Conflict Details Object:**

```typescript
interface SyncConflictDetails {
  blob_id: string;
  local_version: number;
  remote_version: number;
  conflict_type: "version_mismatch" | "concurrent_edit" | "deleted_on_both";
  local_data?: {
    updated_at: string;
    device_name?: string;
  };
  remote_data?: {
    updated_at: string;
    device_name?: string;
  };
}
```

#### SYNC-002: SYNC_ENCRYPTION_FAILED

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 5000ms

```typescript
const SYNC_ENCRYPTION_FAILED: ErrorDefinition = {
  code: ErrorCode.SYNC_ENCRYPTION_FAILED,
  httpStatus: 500,
  userMessage: "Unable to process encrypted data. Please try again.",
  technicalDetails:
    "Server-side encryption processing failed during sync operation",
  isRetryable: true,
  retryAfterMs: 5000,
};
```

**User Experience Guidance:** This error is rare and typically indicates a transient server issue. Automatically retry with exponential backoff. If the error persists after 3 attempts, alert the user and suggest checking their connection.

#### SYNC-003: SYNC_QUEUE_FULL

**HTTP Status:** 503 Service Unavailable  
**Retryable:** Yes  
**Retry Delay:** 30000ms (30 seconds)

```typescript
const SYNC_QUEUE_FULL: ErrorDefinition = {
  code: ErrorCode.SYNC_QUEUE_FULL,
  httpStatus: 503,
  userMessage: "Sync queue is full. Please wait a moment and try again.",
  technicalDetails: "Server-side sync queue has reached maximum capacity",
  isRetryable: true,
  retryAfterMs: 30000,
};
```

**User Experience Guidance:** This error indicates temporary server overload. The client should persist changes locally and retry after the specified delay. Consider prioritizing critical sync operations (recent edits) over bulk operations.

#### SYNC-004: SYNC_NETWORK_ERROR

**HTTP Status:** 503 Service Unavailable  
**Retryable:** Yes  
**Retry Delay:** Variable (exponential backoff)

```typescript
const SYNC_NETWORK_ERROR: ErrorDefinition = {
  code: ErrorCode.SYNC_NETWORK_ERROR,
  httpStatus: 503,
  userMessage:
    "Unable to connect to sync servers. Changes will sync when connection is restored.",
  technicalDetails: "Network connectivity failure during sync operation",
  isRetryable: true,
};
```

**User Experience Guidance:** Enable offline mode and queue changes locally. Show a persistent but non-intrusive indicator that sync is paused. Attempt to reconnect automatically with exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max). When connection is restored, show a brief "Syncing..." indicator before returning to normal state.

#### SYNC-005: SYNC_VERSION_MISMATCH

**HTTP Status:** 409 Conflict  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const SYNC_VERSION_MISMATCH: ErrorDefinition = {
  code: ErrorCode.SYNC_VERSION_MISMATCH,
  httpStatus: 409,
  userMessage: "This item has been updated. Please refresh and try again.",
  technicalDetails: "Client sync version does not match server version",
  isRetryable: false,
};
```

**User Experience Guidance:** Automatically pull the latest version from the server before re-attempting the operation. This error commonly occurs when the user edits the same item on multiple devices in quick succession. The client should fetch the latest version and re-apply local changes if possible.

#### SYNC-006: SYNC_DEVICE_NOT_REGISTERED

**HTTP Status:** 403 Forbidden  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const SYNC_DEVICE_NOT_REGISTERED: ErrorDefinition = {
  code: ErrorCode.SYNC_DEVICE_NOT_REGISTERED,
  httpStatus: 403,
  userMessage: 'This device is not registered for sync. Please re-register the device.',
  technicalDetails: 'Device ID not found in user's registered devices list',
  isRetryable: false,
};
```

**User Experience Guidance:** This can occur if the device was revoked from another session or the device registration was corrupted. Prompt the user to re-register the device through the device management flow.

#### SYNC-007: SYNC_CONFLICT_RESOLUTION_FAILED

**HTTP Status:** 400 Bad Request  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const SYNC_CONFLICT_RESOLUTION_FAILED: ErrorDefinition = {
  code: ErrorCode.SYNC_CONFLICT_RESOLUTION_FAILED,
  httpStatus: 400,
  userMessage:
    "Unable to resolve this conflict. Please try again or choose a different version.",
  technicalDetails:
    "Conflict resolution request failed validation or processing",
  isRetryable: false,
};
```

**User Experience Guidance:** If automatic merge failed, require manual resolution. Provide a fallback to "Keep Local" or "Keep Remote" options. Log the specific resolution failure for debugging.

#### SYNC-008: SYNC_OPERATION_FAILED

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 5000ms

```typescript
const SYNC_OPERATION_FAILED: ErrorDefinition = {
  code: ErrorCode.SYNC_OPERATION_FAILED,
  httpStatus: 500,
  userMessage: "Sync operation failed. Retrying automatically...",
  technicalDetails:
    "Generic sync operation failure with no specific error classification",
  isRetryable: true,
  retryAfterMs: 5000,
};
```

**User Experience Guidance:** Implement automatic retry with exponential backoff. Log the error details for debugging. If the operation fails after maximum retries, present a user-facing error with the option to retry manually.

---

### CRYPT-xxx: Cryptography Errors

Cryptography errors are the most security-sensitive error type. They indicate problems with the encryption/decryption pipeline, which could indicate data corruption, key mismatches, or attempted tampering. These errors are logged with high severity but presented to users with minimal detail to prevent information disclosure. All cryptography operations are performed client-side; server errors in this category typically indicate invalid data being uploaded.

#### CRYPT-001: CRYPT_KEY_NOT_FOUND

**HTTP Status:** 404 Not Found  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const CRYPT_KEY_NOT_FOUND: ErrorDefinition = {
  code: ErrorCode.CRYPT_KEY_NOT_FOUND,
  httpStatus: 404,
  userMessage:
    "Encryption key not found. Please re-login to restore access to your data.",
  technicalDetails:
    "Requested key ID does not exist in key registry for this user",
  isRetryable: false,
};
```

**User Experience Guidance:** This error typically occurs after account recovery or device migration. Prompt the user to re-authenticate, which will re-derive their master key. If the error persists, it may indicate data corruption or that the encrypted blobs were uploaded from a different account.

**Security Note:** Never log or expose key IDs. Key IDs should be treated as sensitive identifiers that could reveal information about encryption key history.

#### CRYPT-002: CRYPT_DECRYPTION_FAILED

**HTTP Status:** 400 Bad Request  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const CRYPT_DECRYPTION_FAILED: ErrorDefinition = {
  code: ErrorCode.CRYPT_DECRYPTION_FAILED,
  httpStatus: 400,
  userMessage: "Unable to decrypt this data. The item may be corrupted.",
  technicalDetails:
    "AES-256-GCM decryption failed - auth tag verification failed or ciphertext modified",
  isRetryable: false,
};
```

**User Experience Guidance:** This indicates that the encrypted blob has been corrupted or tampered with. Attempt to recover from backup if available. If recovery fails, inform the user that the item cannot be decrypted and may need to be deleted. Log the failure with blob ID for diagnostic purposes.

**Recovery Strategy:**

1. Attempt to re-fetch the blob from the server (may be a transient sync issue)
2. Check if a previous version is available
3. Offer to delete the corrupted item if recovery is not possible
4. Log the incident for quality monitoring

#### CRYPT-003: CRYPT_INVALID_NONCE

**HTTP Status:** 400 Bad Request  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const CRYPT_INVALID_NONCE: ErrorDefinition = {
  code: ErrorCode.CRYPT_INVALID_NONCE,
  httpStatus: 400,
  userMessage: "Invalid encryption data. Please refresh and try again.",
  technicalDetails:
    "Nonce length or format does not match expected AES-256-GCM requirements",
  isRetryable: false,
};
```

**User Experience Guidance:** This is typically a data corruption issue. Refresh the item from the server. If the problem persists across multiple devices, it may indicate that the blob was uploaded with incorrect encryption parameters.

#### CRYPT-004: CRYPT_KEY_DERIVATION_FAILED

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 1000ms

```typescript
const CRYPT_KEY_DERIVATION_FAILED: ErrorDefinition = {
  code: ErrorCode.CRYPT_KEY_DERIVATION_FAILED,
  httpStatus: 500,
  userMessage: "Unable to process your credentials. Please try again.",
  technicalDetails:
    "Argon2id key derivation failed - insufficient memory or invalid parameters",
  isRetryable: true,
  retryAfterMs: 1000,
};
```

**User Experience Guidance:** This error is rare and typically indicates server resource constraints. Automatically retry the operation. If it persists, suggest the user try again later.

#### CRYPT-005: CRYPT_INVALID_KEY_ID

**HTTP Status:** 400 Bad Request  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const CRYPT_INVALID_KEY_ID: ErrorDefinition = {
  code: ErrorCode.CRYPT_INVALID_KEY_ID,
  httpStatus: 400,
  userMessage: "Invalid encryption configuration. Please refresh.",
  technicalDetails: "Key ID format or UUID validation failed",
  isRetryable: false,
};
```

**User Experience Guidance:** Request a fresh copy of the blob metadata. This may occur if the client has cached an outdated key ID.

#### CRYPT-006: CRYPT_INVALID_CIPHERTEXT

**HTTP Status:** 400 Bad Request  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const CRYPT_INVALID_CIPHERTEXT: ErrorDefinition = {
  code: ErrorCode.CRYPT_INVALID_CIPHERTEXT,
  httpStatus: 400,
  userMessage: "Invalid encrypted data. Please try again.",
  technicalDetails:
    "Ciphertext format validation failed - not base64 encoded or incorrect length",
  isRetryable: false,
};
```

**User Experience Guidance:** Validate the ciphertext format before uploading. If this error occurs on download, it indicates data corruption. Attempt to re-fetch the blob.

#### CRYPT-007: CRYPT_AUTH_TAG_INVALID

**HTTP Status:** 400 Bad Request  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const CRYPT_AUTH_TAG_INVALID: ErrorDefinition = {
  code: ErrorCode.CRYPT_AUTH_TAG_INVALID,
  httpStatus: 400,
  userMessage: "Data integrity check failed. Please refresh.",
  technicalDetails:
    "AES-256-GCM authentication tag verification failed - ciphertext was modified",
  isRetryable: false,
};
```

**User Experience Guidance:** The authentication tag is part of AES-256-GCM's integrity protection. A failed verification means the ciphertext was altered after encryption. This could indicate data corruption in transit or storage. Attempt to re-fetch the blob.

---

### STOR-xxx: Storage Errors

Storage errors relate to the blob storage system that holds encrypted user data. These errors are typically caused by quota limits, missing blobs, or network issues during upload/download. The storage system is designed to be resilient to transient failures, but persistent storage errors may indicate system issues that require intervention.

#### STOR-001: STOR_QUOTA_EXCEEDED

**HTTP Status:** 507 Insufficient Storage  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const STOR_QUOTA_EXCEEDED: ErrorDefinition = {
  code: ErrorCode.STOR_QUOTA_EXCEEDED,
  httpStatus: 507,
  userMessage:
    "Storage limit reached. Please delete some items or upgrade your plan.",
  technicalDetails:
    "User storage quota has been exceeded for their subscription tier",
  isRetryable: false,
};
```

**User Experience Guidance:** Show the user's current usage and storage limit. Provide quick access to delete large items or upgrade their plan. For free tier users, highlight the benefits of upgrading.

**Storage Limits by Tier:**
| Tier | Storage Limit |
|------|---------------|
| Free | 100 MB |
| Pro | 10 GB |
| Team | 100 GB |

#### STOR-002: STOR_BLOB_NOT_FOUND

**HTTP Status:** 404 Not Found  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const STOR_BLOB_NOT_FOUND: ErrorDefinition = {
  code: ErrorCode.STOR_BLOB_NOT_FOUND,
  httpStatus: 404,
  userMessage: "This item could not be found. It may have been deleted.",
  technicalDetails:
    "Blob ID not found in storage or access denied by RLS policies",
  isRetryable: false,
};
```

**User Experience Guidance:** This error can occur if the blob was deleted from another device, the blob ID is stale, or there are RLS permission issues. Refresh the local cache and remove the reference to the missing blob. If this happens frequently, it may indicate sync issues.

#### STOR-003: STOR_UPLOAD_FAILED

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 5000ms

```typescript
const STOR_UPLOAD_FAILED: ErrorDefinition = {
  code: ErrorCode.STOR_UPLOAD_FAILED,
  httpStatus: 500,
  userMessage: "Upload failed. Please try again.",
  technicalDetails:
    "Blob storage upload operation failed - storage service error",
  isRetryable: true,
  retryAfterMs: 5000,
};
```

**User Experience Guidance:** Implement automatic retry with exponential backoff. If the upload fails after 5 attempts, show a user-facing error with manual retry option. Check network connectivity and consider breaking large uploads into chunks.

#### STOR-004: STOR_DOWNLOAD_FAILED

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 5000ms

```typescript
const STOR_DOWNLOAD_FAILED: ErrorDefinition = {
  code: ErrorCode.STOR_DOWNLOAD_FAILED,
  httpStatus: 500,
  userMessage: "Download failed. Please try again.",
  technicalDetails:
    "Blob storage download operation failed - storage service error",
  isRetryable: true,
  retryAfterMs: 5000,
};
```

**User Experience Guidance:** Implement automatic retry with exponential backoff. For large blobs, consider implementing resumable downloads. Show download progress when possible.

#### STOR-005: STOR_PAYLOAD_TOO_LARGE

**HTTP Status:** 413 Payload Too Large  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const STOR_PAYLOAD_TOO_LARGE: ErrorDefinition = {
  code: ErrorCode.STOR_PAYLOAD_TOO_LARGE,
  httpStatus: 413,
  userMessage: "This item is too large to upload. Maximum size is 50MB.",
  technicalDetails: "Upload payload exceeds maximum blob size limit",
  isRetryable: false,
};
```

**User Experience Guidance:** Enforce the 50MB limit before attempting upload. Show the file size limit in the upload UI. For users who need to store large files, suggest breaking them into smaller chunks or using external storage.

**Maximum Sizes:**
| Content Type | Maximum Size |
|--------------|-------------|
| Notes | 1 MB |
| PDFs | 50 MB |
| Annotations | 5 MB |

#### STOR-006: STOR_DELETE_FAILED

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 5000ms

```typescript
const STOR_DELETE_FAILED: ErrorDefinition = {
  code: ErrorCode.STOR_DELETE_FAILED,
  httpStatus: 500,
  userMessage: "Delete failed. Please try again.",
  technicalDetails: "Blob storage delete operation failed",
  isRetryable: true,
  retryAfterMs: 5000,
};
```

**User Experience Guidance:** Implement automatic retry. The blob can be marked as "deleted" locally even if the server deletion fails; the sync system will eventually clean it up.

---

### GEN-xxx: General Errors

General errors are catch-all errors that don't fit into other categories. They include network issues, server errors, rate limiting, and invalid requests. These errors are typically transient or require user action to resolve. The goal is to provide clear guidance to users while logging sufficient information for debugging.

#### GEN-001: GEN_NETWORK_ERROR

**HTTP Status:** 503 Service Unavailable  
**Retryable:** Yes  
**Retry Delay:** Variable

```typescript
const GEN_NETWORK_ERROR: ErrorDefinition = {
  code: ErrorCode.GEN_NETWORK_ERROR,
  httpStatus: 503,
  userMessage:
    "Unable to connect to servers. Please check your internet connection.",
  technicalDetails:
    "Network request failed - DNS resolution, connection timeout, or network unreachable",
  isRetryable: true,
};
```

**User Experience Guidance:** Enable offline mode and queue operations. Attempt to reconnect automatically with exponential backoff. Show a subtle indicator when offline. When connection is restored, show "Syncing..." briefly before returning to normal.

**Offline Strategy:**

1. Detect network state changes
2. Queue all write operations locally
3. Process queue when connection is restored
4. Show last sync time when offline
5. Warn users if they have unsynced changes before long offline periods

#### GEN-002: GEN_SERVER_ERROR

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 30000ms (30 seconds)

```typescript
const GEN_SERVER_ERROR: ErrorDefinition = {
  code: ErrorCode.GEN_SERVER_ERROR,
  httpStatus: 500,
  userMessage:
    "Server error. We are working on it. Please try again in a moment.",
  technicalDetails: "Generic server error - check server logs for details",
  isRetryable: true,
  retryAfterMs: 30000,
};
```

**User Experience Guidance:** This is a catch-all for server-side failures. Implement automatic retry with extended delay. If the error persists, it may indicate a broader outage. Show a temporary error state but allow the user to continue working offline if possible.

#### GEN-003: GEN_RATE_LIMITED

**HTTP Status:** 429 Too Many Requests  
**Retryable:** Yes  
**Retry Delay:** From header

```typescript
const GEN_RATE_LIMITED: ErrorDefinition = {
  code: ErrorCode.GEN_RATE_LIMITED,
  httpStatus: 429,
  userMessage: "Too many requests. Please slow down.",
  technicalDetails: "Rate limit exceeded - X-RateLimit-Remaining reached 0",
  isRetryable: true,
  retryAfterMs: 60000,
};
```

**User Experience Guidance:** Respect the Retry-After header. Implement exponential backoff for retry attempts. Show a rate limit indicator when approaching the limit. Consider implementing request batching to reduce API calls.

**Rate Limits by Tier:**
| Tier | Requests/Minute |
|------|----------------|
| Free | 100 |
| Pro | 1000 |
| Team | 10000 |

#### GEN-004: GEN_INVALID_REQUEST

**HTTP Status:** 400 Bad Request  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const GEN_INVALID_REQUEST: ErrorDefinition = {
  code: ErrorCode.GEN_INVALID_REQUEST,
  httpStatus: 400,
  userMessage: "Invalid request. Please check your input and try again.",
  technicalDetails:
    "Request validation failed - missing required fields or invalid format",
  isRetryable: false,
};
```

**User Experience Guidance:** Validate all inputs before submission. Highlight specific fields that have invalid values. Provide helpful validation messages (e.g., "Email must include @domain.com").

#### GEN-005: GEN_FEATURE_NOT_AVAILABLE

**HTTP Status:** 403 Forbidden  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const GEN_FEATURE_NOT_AVAILABLE: ErrorDefinition = {
  code: ErrorCode.GEN_FEATURE_NOT_AVAILABLE,
  httpStatus: 403,
  userMessage:
    "This feature is not available on your current plan. Upgrade to access.",
  technicalDetails:
    "Feature access denied - subscription tier does not include this feature",
  isRetryable: false,
};
```

**User Experience Guidance:** Show a clear upsell dialog explaining the feature and benefits of upgrading. Provide a direct path to upgrade. Never hide the feature completely - users should understand what's available in higher tiers.

#### GEN-006: GEN_SERVICE_UNAVAILABLE

**HTTP Status:** 503 Service Unavailable  
**Retryable:** Yes  
**Retry Delay:** 60000ms (1 minute)

```typescript
const GEN_SERVICE_UNAVAILABLE: ErrorDefinition = {
  code: ErrorCode.GEN_SERVICE_UNAVAILABLE,
  httpStatus: 503,
  userMessage: "Service is temporarily unavailable. Retrying automatically...",
  technicalDetails: "Service is in maintenance mode or experiencing high load",
  isRetryable: true,
  retryAfterMs: 60000,
};
```

**User Experience Guidance:** Implement automatic retry with extended delays. This error indicates a planned or unplanned service outage. Allow users to continue working offline. Show a non-intrusive status indicator.

#### GEN-007: GEN_INTERNAL_ERROR

**HTTP Status:** 500 Internal Server Error  
**Retryable:** Yes  
**Retry Delay:** 10000ms (10 seconds)

```typescript
const GEN_INTERNAL_ERROR: ErrorDefinition = {
  code: ErrorCode.GEN_INTERNAL_ERROR,
  httpStatus: 500,
  userMessage: "Something went wrong. Please try again.",
  technicalDetails: "Unhandled exception or internal error - check server logs",
  isRetryable: true,
  retryAfterMs: 10000,
};
```

**User Experience Guidance:** Generic error for unhandled cases. Implement automatic retry. If errors persist, they will be flagged for engineering review via monitoring.

#### GEN-008: GEN_PAYMENT_REQUIRED

**HTTP Status:** 402 Payment Required  
**Retryable:** No  
**Retry Delay:** N/A

```typescript
const GEN_PAYMENT_REQUIRED: ErrorDefinition = {
  code: ErrorCode.GEN_PAYMENT_REQUIRED,
  httpStatus: 402,
  userMessage:
    "Payment required to continue. Please update your payment method.",
  technicalDetails: "Subscription payment failed - card declined or expired",
  isRetryable: false,
};
```

**User Experience Guidance:** Direct users to update their payment method. Show a clear message about service interruption. Provide a grace period before restricting access.

---

## Error Message Registry

```typescript
export const ERROR_MESSAGES: Record<ErrorCode, ErrorDefinition> = {
  // Authentication Errors
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
    code: ErrorCode.AUTH_INVALID_CREDENTIALS,
    httpStatus: 401,
    userMessage:
      "Invalid email or password. Please try again or reset your password.",
    technicalDetails:
      "Email hash not found in database or password derivation failed validation",
    isRetryable: true,
    retryAfterMs: 2000,
  },
  [ErrorCode.AUTH_TOKEN_EXPIRED]: {
    code: ErrorCode.AUTH_TOKEN_EXPIRED,
    httpStatus: 401,
    userMessage: "Your session has expired. Please sign in again to continue.",
    technicalDetails: "JWT access token has passed its expiration time",
    isRetryable: true,
    retryAfterMs: 0,
  },
  [ErrorCode.AUTH_TOKEN_INVALID]: {
    code: ErrorCode.AUTH_TOKEN_INVALID,
    httpStatus: 401,
    userMessage: "Invalid session. Please sign in again.",
    technicalDetails:
      "JWT token signature verification failed or token malformed",
    isRetryable: true,
    retryAfterMs: 0,
  },
  [ErrorCode.AUTH_DEVICE_LIMIT_EXCEEDED]: {
    code: ErrorCode.AUTH_DEVICE_LIMIT_EXCEEDED,
    httpStatus: 403,
    userMessage:
      "Maximum device limit reached. Please remove an existing device to add a new one.",
    technicalDetails:
      "User has reached maximum allowed devices for their subscription tier",
    isRetryable: false,
  },
  [ErrorCode.AUTH_BIOMETRIC_FAILED]: {
    code: ErrorCode.AUTH_BIOMETRIC_FAILED,
    httpStatus: 401,
    userMessage:
      "Biometric authentication failed. Please use your password instead.",
    technicalDetails:
      "Biometric proof verification failed or biometric enrollment not found",
    isRetryable: true,
    retryAfterMs: 500,
  },
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: {
    code: ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
    httpStatus: 409,
    userMessage:
      "An account with this email already exists. Please sign in instead.",
    technicalDetails:
      "Email hash collision detected during registration attempt",
    isRetryable: false,
  },
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: {
    code: ErrorCode.AUTH_ACCOUNT_LOCKED,
    httpStatus: 423,
    userMessage:
      "Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.",
    technicalDetails:
      "Account locked after 5 consecutive failed authentication attempts",
    isRetryable: true,
    retryAfterMs: 900000,
  },
  [ErrorCode.AUTH_REFRESH_TOKEN_INVALID]: {
    code: ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
    httpStatus: 401,
    userMessage: "Session invalidated. Please sign in again.",
    technicalDetails:
      "Refresh token has been revoked, expired, or used previously",
    isRetryable: false,
  },
  [ErrorCode.AUTH_OAUTH_FAILED]: {
    code: ErrorCode.AUTH_OAUTH_FAILED,
    httpStatus: 400,
    userMessage:
      "OAuth authentication failed. Please try again or use a different method.",
    technicalDetails:
      "OAuth provider returned error or token validation failed",
    isRetryable: true,
    retryAfterMs: 1000,
  },

  // Synchronization Errors
  [ErrorCode.SYNC_CONFLICT_DETECTED]: {
    code: ErrorCode.SYNC_CONFLICT_DETECTED,
    httpStatus: 409,
    userMessage:
      "Another device made changes to this item. Choose which version to keep.",
    technicalDetails:
      "CRDT version conflict detected during sync push operation",
    isRetryable: false,
  },
  [ErrorCode.SYNC_ENCRYPTION_FAILED]: {
    code: ErrorCode.SYNC_ENCRYPTION_FAILED,
    httpStatus: 500,
    userMessage: "Unable to process encrypted data. Please try again.",
    technicalDetails:
      "Server-side encryption processing failed during sync operation",
    isRetryable: true,
    retryAfterMs: 5000,
  },
  [ErrorCode.SYNC_QUEUE_FULL]: {
    code: ErrorCode.SYNC_QUEUE_FULL,
    httpStatus: 503,
    userMessage: "Sync queue is full. Please wait a moment and try again.",
    technicalDetails: "Server-side sync queue has reached maximum capacity",
    isRetryable: true,
    retryAfterMs: 30000,
  },
  [ErrorCode.SYNC_NETWORK_ERROR]: {
    code: ErrorCode.SYNC_NETWORK_ERROR,
    httpStatus: 503,
    userMessage:
      "Unable to connect to sync servers. Changes will sync when connection is restored.",
    technicalDetails: "Network connectivity failure during sync operation",
    isRetryable: true,
  },
  [ErrorCode.SYNC_VERSION_MISMATCH]: {
    code: ErrorCode.SYNC_VERSION_MISMATCH,
    httpStatus: 409,
    userMessage: "This item has been updated. Please refresh and try again.",
    technicalDetails: "Client sync version does not match server version",
    isRetryable: false,
  },
  [ErrorCode.SYNC_DEVICE_NOT_REGISTERED]: {
    code: ErrorCode.SYNC_DEVICE_NOT_REGISTERED,
    httpStatus: 403,
    userMessage:
      "This device is not registered for sync. Please re-register the device.",
    technicalDetails: "Device ID not found in user registered devices list",
    isRetryable: false,
  },
  [ErrorCode.SYNC_CONFLICT_RESOLUTION_FAILED]: {
    code: ErrorCode.SYNC_CONFLICT_RESOLUTION_FAILED,
    httpStatus: 400,
    userMessage:
      "Unable to resolve this conflict. Please try again or choose a different version.",
    technicalDetails:
      "Conflict resolution request failed validation or processing",
    isRetryable: false,
  },
  [ErrorCode.SYNC_OPERATION_FAILED]: {
    code: ErrorCode.SYNC_OPERATION_FAILED,
    httpStatus: 500,
    userMessage: "Sync operation failed. Retrying automatically...",
    technicalDetails:
      "Generic sync operation failure with no specific error classification",
    isRetryable: true,
    retryAfterMs: 5000,
  },

  // Cryptography Errors
  [ErrorCode.CRYPT_KEY_NOT_FOUND]: {
    code: ErrorCode.CRYPT_KEY_NOT_FOUND,
    httpStatus: 404,
    userMessage:
      "Encryption key not found. Please re-login to restore access to your data.",
    technicalDetails:
      "Requested key ID does not exist in key registry for this user",
    isRetryable: false,
  },
  [ErrorCode.CRYPT_DECRYPTION_FAILED]: {
    code: ErrorCode.CRYPT_DECRYPTION_FAILED,
    httpStatus: 400,
    userMessage: "Unable to decrypt this data. The item may be corrupted.",
    technicalDetails:
      "AES-256-GCM decryption failed - auth tag verification failed or ciphertext modified",
    isRetryable: false,
  },
  [ErrorCode.CRYPT_INVALID_NONCE]: {
    code: ErrorCode.CRYPT_INVALID_NONCE,
    httpStatus: 400,
    userMessage: "Invalid encryption data. Please refresh and try again.",
    technicalDetails:
      "Nonce length or format does not match expected AES-256-GCM requirements",
    isRetryable: false,
  },
  [ErrorCode.CRYPT_KEY_DERIVATION_FAILED]: {
    code: ErrorCode.CRYPT_KEY_DERIVATION_FAILED,
    httpStatus: 500,
    userMessage: "Unable to process your credentials. Please try again.",
    technicalDetails:
      "Argon2id key derivation failed - insufficient memory or invalid parameters",
    isRetryable: true,
    retryAfterMs: 1000,
  },
  [ErrorCode.CRYPT_INVALID_KEY_ID]: {
    code: ErrorCode.CRYPT_INVALID_KEY_ID,
    httpStatus: 400,
    userMessage: "Invalid encryption configuration. Please refresh.",
    technicalDetails: "Key ID format or UUID validation failed",
    isRetryable: false,
  },
  [ErrorCode.CRYPT_INVALID_CIPHERTEXT]: {
    code: ErrorCode.CRYPT_INVALID_CIPHERTEXT,
    httpStatus: 400,
    userMessage: "Invalid encrypted data. Please try again.",
    technicalDetails:
      "Ciphertext format validation failed - not base64 encoded or incorrect length",
    isRetryable: false,
  },
  [ErrorCode.CRYPT_AUTH_TAG_INVALID]: {
    code: ErrorCode.CRYPT_AUTH_TAG_INVALID,
    httpStatus: 400,
    userMessage: "Data integrity check failed. Please refresh.",
    technicalDetails:
      "AES-256-GCM authentication tag verification failed - ciphertext was modified",
    isRetryable: false,
  },

  // Storage Errors
  [ErrorCode.STOR_QUOTA_EXCEEDED]: {
    code: ErrorCode.STOR_QUOTA_EXCEEDED,
    httpStatus: 507,
    userMessage:
      "Storage limit reached. Please delete some items or upgrade your plan.",
    technicalDetails:
      "User storage quota has been exceeded for their subscription tier",
    isRetryable: false,
  },
  [ErrorCode.STOR_BLOB_NOT_FOUND]: {
    code: ErrorCode.STOR_BLOB_NOT_FOUND,
    httpStatus: 404,
    userMessage: "This item could not be found. It may have been deleted.",
    technicalDetails:
      "Blob ID not found in storage or access denied by RLS policies",
    isRetryable: false,
  },
  [ErrorCode.STOR_UPLOAD_FAILED]: {
    code: ErrorCode.STOR_UPLOAD_FAILED,
    httpStatus: 500,
    userMessage: "Upload failed. Please try again.",
    technicalDetails:
      "Blob storage upload operation failed - storage service error",
    isRetryable: true,
    retryAfterMs: 5000,
  },
  [ErrorCode.STOR_DOWNLOAD_FAILED]: {
    code: ErrorCode.STOR_DOWNLOAD_FAILED,
    httpStatus: 500,
    userMessage: "Download failed. Please try again.",
    technicalDetails:
      "Blob storage download operation failed - storage service error",
    isRetryable: true,
    retryAfterMs: 5000,
  },
  [ErrorCode.STOR_PAYLOAD_TOO_LARGE]: {
    code: ErrorCode.STOR_PAYLOAD_TOO_LARGE,
    httpStatus: 413,
    userMessage: "This item is too large to upload. Maximum size is 50MB.",
    technicalDetails: "Upload payload exceeds maximum blob size limit",
    isRetryable: false,
  },
  [ErrorCode.STOR_DELETE_FAILED]: {
    code: ErrorCode.STOR_DELETE_FAILED,
    httpStatus: 500,
    userMessage: "Delete failed. Please try again.",
    technicalDetails: "Blob storage delete operation failed",
    isRetryable: true,
    retryAfterMs: 5000,
  },

  // General Errors
  [ErrorCode.GEN_NETWORK_ERROR]: {
    code: ErrorCode.GEN_NETWORK_ERROR,
    httpStatus: 503,
    userMessage:
      "Unable to connect to servers. Please check your internet connection.",
    technicalDetails:
      "Network request failed - DNS resolution, connection timeout, or network unreachable",
    isRetryable: true,
  },
  [ErrorCode.GEN_SERVER_ERROR]: {
    code: ErrorCode.GEN_SERVER_ERROR,
    httpStatus: 500,
    userMessage:
      "Server error. We are working on it. Please try again in a moment.",
    technicalDetails: "Generic server error - check server logs for details",
    isRetryable: true,
    retryAfterMs: 30000,
  },
  [ErrorCode.GEN_RATE_LIMITED]: {
    code: ErrorCode.GEN_RATE_LIMITED,
    httpStatus: 429,
    userMessage: "Too many requests. Please slow down.",
    technicalDetails: "Rate limit exceeded - X-RateLimit-Remaining reached 0",
    isRetryable: true,
    retryAfterMs: 60000,
  },
  [ErrorCode.GEN_INVALID_REQUEST]: {
    code: ErrorCode.GEN_INVALID_REQUEST,
    httpStatus: 400,
    userMessage: "Invalid request. Please check your input and try again.",
    technicalDetails:
      "Request validation failed - missing required fields or invalid format",
    isRetryable: false,
  },
  [ErrorCode.GEN_FEATURE_NOT_AVAILABLE]: {
    code: ErrorCode.GEN_FEATURE_NOT_AVAILABLE,
    httpStatus: 403,
    userMessage:
      "This feature is not available on your current plan. Upgrade to access.",
    technicalDetails:
      "Feature access denied - subscription tier does not include this feature",
    isRetryable: false,
  },
  [ErrorCode.GEN_SERVICE_UNAVAILABLE]: {
    code: ErrorCode.GEN_SERVICE_UNAVAILABLE,
    httpStatus: 503,
    userMessage:
      "Service is temporarily unavailable. Retrying automatically...",
    technicalDetails:
      "Service is in maintenance mode or experiencing high load",
    isRetryable: true,
    retryAfterMs: 60000,
  },
  [ErrorCode.GEN_INTERNAL_ERROR]: {
    code: ErrorCode.GEN_INTERNAL_ERROR,
    httpStatus: 500,
    userMessage: "Something went wrong. Please try again.",
    technicalDetails:
      "Unhandled exception or internal error - check server logs",
    isRetryable: true,
    retryAfterMs: 10000,
  },
  [ErrorCode.GEN_PAYMENT_REQUIRED]: {
    code: ErrorCode.GEN_PAYMENT_REQUIRED,
    httpStatus: 402,
    userMessage:
      "Payment required to continue. Please update your payment method.",
    technicalDetails: "Subscription payment failed - card declined or expired",
    isRetryable: false,
  },
};
```

---

## Client-Side Error Handling Guide

This section provides implementation examples for common error handling scenarios. Each example demonstrates best practices for handling specific error categories while maintaining a good user experience.

### Token Refresh Flow

Authentication errors require special handling to maintain session continuity. The token refresh flow should be transparent to users and handle various failure scenarios gracefully.

```typescript
import { ErrorCode, ERROR_MESSAGES } from "@notechain/data-models";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class AuthManager {
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;

  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("Not authenticated");
    }

    if (this.isTokenExpired()) {
      return this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  private isTokenExpired(): boolean {
    if (!this.tokens) return true;
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer
    return Date.now() > this.tokens.expiresAt - bufferMs;
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newTokens = await this.refreshPromise;
      this.tokens = newTokens;
      return newTokens.accessToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    const response = await fetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: this.tokens?.refreshToken }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);

      if (error.code === ErrorCode.AUTH_REFRESH_TOKEN_INVALID) {
        this.clearTokens();
        throw new AuthenticationRequiredError(
          "Session expired, please sign in again",
        );
      }

      if (error.code === ErrorCode.AUTH_TOKEN_EXPIRED) {
        throw new AuthenticationRequiredError("Please sign in again");
      }

      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  private async parseErrorResponse(
    response: Response,
  ): Promise<{ code: string; message: string }> {
    try {
      const error = await response.json();
      return {
        code: error.code || "UNKNOWN",
        message: error.message || "Unknown error",
      };
    } catch {
      return { code: "UNKNOWN", message: "Unknown error" };
    }
  }

  clearTokens(): void {
    this.tokens = null;
  }
}

class AuthenticationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}
```

The token refresh implementation uses a promise cache to prevent multiple simultaneous refresh requests. This prevents race conditions where multiple API calls attempt to refresh the token at the same time. The implementation includes a 5-minute buffer before expiration to proactively refresh tokens before they actually expire.

### Sync Conflict Resolution UI

Sync conflicts require user intervention to resolve. The UI should present both versions clearly and provide intuitive options for resolution.

```typescript
import { ErrorCode } from "@notechain/data-models";

interface SyncConflict {
  blobId: string;
  localVersion: number;
  remoteVersion: number;
  conflictType: "version_mismatch" | "concurrent_edit" | "deleted_on_both";
  localData?: EncryptedBlob;
  remoteData?: EncryptedBlob;
}

type ConflictResolution = "keep_local" | "keep_remote" | "merge";

class ConflictResolver {
  async showConflictDialog(
    conflict: SyncConflict,
  ): Promise<ConflictResolution> {
    const localModified = conflict.localData?.updated_at
      ? new Date(conflict.localData.updated_at)
      : null;
    const remoteModified = conflict.remoteData?.updated_at
      ? new Date(conflict.remoteData.updated_at)
      : null;

    const dialog = new ConflictDialog({
      title: "Sync Conflict Detected",
      message: "This item was modified on another device.",
      localVersion: {
        version: conflict.localVersion,
        modified: localModified,
        preview: this.extractPreview(conflict.localData),
      },
      remoteVersion: {
        version: conflict.remoteVersion,
        modified: remoteModified,
        preview: this.extractPreview(conflict.remoteData),
      },
      options: [
        { id: "keep_local", label: "Keep My Version" },
        { id: "keep_remote", label: "Keep Their Version" },
        { id: "merge", label: "Merge Changes" },
      ],
    });

    return dialog.show();
  }

  async resolveConflict(
    blobId: string,
    resolution: ConflictResolution,
    mergedData?: { ciphertext: string; nonce: string },
  ): Promise<void> {
    const response = await fetch("/sync/resolve-conflict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blob_id: blobId,
        resolution,
        ...(resolution === "merge" && mergedData
          ? {
              merged_ciphertext: mergedData.ciphertext,
              merged_nonce: mergedData.nonce,
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const error = await this.parseError(response);

      if (error.code === ErrorCode.SYNC_CONFLICT_RESOLUTION_FAILED) {
        throw new Error("Unable to resolve conflict. Please try again.");
      }

      throw error;
    }
  }

  private extractPreview(blob?: EncryptedBlob): string {
    if (!blob) return "(Deleted)";
    // Extract first few characters of decrypted content for preview
    return "[Content Preview]";
  }

  private async parseError(response: Response): Promise<Error> {
    const error = await response.json();
    return new Error(error.message || "Unknown error");
  }
}

class ConflictDialog {
  private resolve: ((value: ConflictResolution) => void) | null = null;

  constructor(
    private config: {
      title: string;
      message: string;
      localVersion: { version: number; modified: Date | null; preview: string };
      remoteVersion: {
        version: number;
        modified: Date | null;
        preview: string;
      };
      options: Array<{ id: ConflictResolution; label: string }>;
    },
  ) {}

  show(): Promise<ConflictResolution> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.render();
    });
  }

  private render(): void {
    // Platform-specific dialog rendering
    // On iOS: UIAlertController
    // On Android: AlertDialog
    // On Web: Modal dialog
  }

  select(option: ConflictResolution): void {
    if (this.resolve) {
      this.resolve(option);
      this.resolve = null;
    }
  }
}
```

### Network Error and Offline Mode

Network errors require robust handling to maintain functionality during connectivity issues. The implementation should queue operations and sync when connectivity is restored.

```typescript
import { ErrorCode } from "@notechain/data-models";

type NetworkStatus = "online" | "offline" | "connecting";

interface QueuedOperation {
  id: string;
  type: "create" | "update" | "delete";
  endpoint: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

class NetworkManager {
  private status: NetworkStatus = "online";
  private queue: QueuedOperation[] = [];
  private maxRetries = 5;
  private readonly baseDelay = 1000;

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
    }
  }

  private handleOffline(): void {
    this.status = "offline";
    this.processQueue();
  }

  private handleOnline(): void {
    this.status = "connecting";
    setTimeout(() => {
      this.status = "online";
      this.processQueue();
    }, 1000);
  }

  async request<T>(
    endpoint: string,
    options: RequestInit,
    requireAuth = true,
  ): Promise<T> {
    if (this.status === "offline" && !navigator.onLine) {
      return this.queueAndWait(endpoint, options, requireAuth);
    }

    try {
      return await this.executeRequest<T>(endpoint, options, requireAuth);
    } catch (error) {
      if (this.isNetworkError(error)) {
        return this.handleNetworkError(endpoint, options, requireAuth);
      }
      throw error;
    }
  }

  private async queueAndWait<T>(
    endpoint: string,
    options: RequestInit,
    requireAuth: boolean,
  ): Promise<T> {
    const operation: QueuedOperation = {
      id: this.generateId(),
      type: this.getOperationType(options.method),
      endpoint,
      payload: options.body ? JSON.parse(options.body as string) : null,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(operation);
    await this.processQueue();

    return new Promise((resolve, reject) => {
      const checkComplete = setInterval(() => {
        const index = this.queue.findIndex((op) => op.id === operation.id);
        if (index === -1) {
          clearInterval(checkComplete);
          this.getResult(operation.id).then(resolve).catch(reject);
        }
      }, 1000);
    });
  }

  private async handleNetworkError<T>(
    endpoint: string,
    options: RequestInit,
    requireAuth: boolean,
  ): Promise<T> {
    const operation: QueuedOperation = {
      id: this.generateId(),
      type: this.getOperationType(options.method),
      endpoint,
      payload: options.body ? JSON.parse(options.body as string) : null,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(operation);
    this.processQueue();

    return new Promise((resolve, reject) => {
      const checkComplete = setInterval(() => {
        const index = this.queue.findIndex((op) => op.id === operation.id);
        if (index === -1) {
          clearInterval(checkComplete);
          this.getResult(operation.id).then(resolve).catch(reject);
        } else if (operation.retryCount >= this.maxRetries) {
          clearInterval(checkComplete);
          this.queue = this.queue.filter((op) => op.id !== operation.id);
          reject(new Error("Operation failed after maximum retries"));
        }
      }, 1000);
    });
  }

  private async processQueue(): Promise<void> {
    if (this.status === "offline" || this.queue.length === 0) {
      return;
    }

    const sortedQueue = this.queue.sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of sortedQueue) {
      try {
        await this.executeQueuedOperation(operation);
        this.queue = this.queue.filter((op) => op.id !== operation.id);
      } catch (error) {
        if (this.isRetryableError(error)) {
          operation.retryCount++;
          const delay = this.calculateBackoff(operation.retryCount);
          await this.sleep(delay);
        } else {
          this.queue = this.queue.filter((op) => op.id !== operation.id);
          console.error("Operation failed permanently:", operation, error);
        }
      }
    }
  }

  private async executeQueuedOperation(
    operation: QueuedOperation,
  ): Promise<void> {
    const response = await fetch(operation.endpoint, {
      method: this.getHttpMethod(operation.type),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operation.payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }
  }

  private calculateBackoff(retryCount: number): number {
    return Math.min(this.baseDelay * Math.pow(2, retryCount - 1), 30000);
  }

  private async getResult(operationId: string): Promise<never> {
    throw new Error("Result not available");
  }

  private isNetworkError(error: unknown): boolean {
    return (
      error instanceof TypeError ||
      (error as { code?: string })?.code === ErrorCode.GEN_NETWORK_ERROR
    );
  }

  private isRetryableError(error: unknown): boolean {
    return (error as { isRetryable?: boolean })?.isRetryable === true;
  }

  private getOperationType(method?: string): "create" | "update" | "delete" {
    switch (method) {
      case "POST":
        return "create";
      case "PUT":
      case "PATCH":
        return "update";
      case "DELETE":
        return "delete";
      default:
        return "create";
    }
  }

  private getHttpMethod(type: "create" | "update" | "delete"): string {
    switch (type) {
      case "create":
        return "POST";
      case "update":
        return "PUT";
      case "delete":
        return "DELETE";
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Exponential Backoff for Rate Limiting

Rate limiting errors require respectful handling to avoid worsening the situation. The implementation should implement exponential backoff with jitter to distribute retry attempts.

```typescript
import { ErrorCode } from "@notechain/data-models";

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

class RateLimitHandler {
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private readonly maxAttempts = 5;
  private readonly baseDelay = 1000;
  private readonly maxDelay = 60000;

  async executeWithBackoff<T>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isRateLimitError(error)) {
          throw error;
        }

        attempt++;

        if (attempt > this.maxAttempts) {
          throw new Error("Maximum retry attempts exceeded");
        }

        const rateLimitInfo = this.extractRateLimitInfo(error);
        if (rateLimitInfo) {
          this.rateLimits.set(key, rateLimitInfo);
        }

        const delay = this.calculateDelay(attempt, rateLimitInfo);
        await this.sleep(delay);
      }
    }
  }

  private isRateLimitError(error: unknown): boolean {
    return (error as { code?: string })?.code === ErrorCode.GEN_RATE_LIMITED;
  }

  private extractRateLimitInfo(error: unknown): RateLimitInfo | null {
    const details = (error as { details?: { retryAfter?: number } })?.details;
    const retryAfter = details?.retryAfter;

    if (typeof retryAfter === "number") {
      return {
        limit: 0,
        remaining: 0,
        resetAt: Date.now() + retryAfter,
      };
    }

    return null;
  }

  private calculateDelay(
    attempt: number,
    rateLimitInfo?: RateLimitInfo | null,
  ): number {
    if (rateLimitInfo?.resetAt) {
      const timeUntilReset = rateLimitInfo.resetAt - Date.now();
      if (timeUntilReset > 0) {
        return Math.min(timeUntilReset + 1000, this.maxDelay);
      }
    }

    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, attempt - 1),
      this.maxDelay,
    );

    const jitter = Math.random() * 0.3 * exponentialDelay;

    return Math.floor(exponentialDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRemainingRequests(key: string): number {
    return this.rateLimits.get(key)?.remaining ?? -1;
  }
}
```

### Key Recovery Flow

Cryptography errors related to key issues require a specific recovery flow. The implementation should guide users through the key recovery process while maintaining security.

```typescript
import { ErrorCode } from "@notechain/data-models";

interface RecoveryKey {
  id: string;
  encryptedKey: string;
  hint?: string;
}

class KeyRecoveryManager {
  private readonly maxRecoveryAttempts = 3;

  async handleKeyNotFoundError(): Promise<boolean> {
    const hasRecoveryKeys = await this.checkForRecoveryKeys();

    if (!hasRecoveryKeys) {
      await this.promptReauthentication();
      return false;
    }

    return this.initiateRecoveryFlow();
  }

  private async checkForRecoveryKeys(): Promise<boolean> {
    const response = await fetch("/auth/recovery-keys", {
      method: "GET",
      headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return Array.isArray(data.recovery_keys) && data.recovery_keys.length > 0;
  }

  private async promptReauthentication(): Promise<void> {
    await this.showDialog({
      title: "Session Expired",
      message:
        "Your encryption keys could not be loaded. Please sign in again to restore access.",
      actions: [{ id: "signin", label: "Sign In" }],
    });
  }

  private async initiateRecoveryFlow(): Promise<boolean> {
    const recoveryKey = await this.promptForRecoveryKey();

    if (!recoveryKey) {
      return false;
    }

    const attemptRecovery = async (): Promise<boolean> => {
      try {
        const response = await this.submitRecoveryKey(recoveryKey);

        if (response.success) {
          await this.rederiveEncryptionKeys();
          return true;
        }

        return false;
      } catch (error) {
        if (
          (error as { code?: string })?.code ===
          ErrorCode.AUTH_INVALID_CREDENTIALS
        ) {
          return false;
        }
        throw error;
      }
    };

    for (let attempt = 1; attempt <= this.maxRecoveryAttempts; attempt++) {
      const success = await attemptRecovery();

      if (success) {
        await this.showDialog({
          title: "Recovery Successful",
          message: "Your encryption keys have been restored.",
          actions: [{ id: "continue", label: "Continue" }],
        });
        return true;
      }

      if (attempt < this.maxRecoveryAttempts) {
        await this.showDialog({
          title: "Invalid Recovery Key",
          message: `The recovery key was not valid. ${this.maxRecoveryAttempts - attempt} attempts remaining.`,
          actions: [
            { id: "retry", label: "Try Again" },
            { id: "cancel", label: "Cancel" },
          ],
        });
      }
    }

    await this.showDialog({
      title: "Recovery Failed",
      message:
        "Unable to restore your encryption keys. Please contact support.",
      actions: [{ id: "support", label: "Contact Support" }],
    });

    return false;
  }

  private async promptForRecoveryKey(): Promise<string | null> {
    const dialog = new RecoveryKeyDialog({
      title: "Enter Recovery Key",
      message:
        "Enter one of your recovery keys to restore access to your encrypted data.",
      hint: "Recovery keys are 32-character codes shown when you generated them.",
    });

    return dialog.show();
  }

  private async submitRecoveryKey(
    recoveryKey: string,
  ): Promise<{ success: boolean }> {
    const response = await fetch("/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recovery_key: recoveryKey }),
    });

    const error = await response.json();

    if (response.status === 401) {
      throw error;
    }

    if (!response.ok) {
      throw new Error("Recovery submission failed");
    }

    return { success: true };
  }

  private async rederiveEncryptionKeys(): Promise<void> {
    const masterKey = await this.deriveMasterKeyFromCredentials();
    await this.storeMasterKeySecurely(masterKey);
  }

  private async deriveMasterKeyFromCredentials(): Promise<Uint8Array> {
    throw new Error("Not implemented");
  }

  private async storeMasterKeySecurely(key: Uint8Array): Promise<void> {
    throw new Error("Not implemented");
  }

  private async showDialog(config: {
    title: string;
    message: string;
    actions: Array<{ id: string; label: string }>;
  }): Promise<string> {
    return new Promise((resolve) => {
      const dialog = new AlertDialog(config);
      dialog.onAction = (actionId) => resolve(actionId);
    });
  }

  private async getAccessToken(): Promise<string> {
    throw new Error("Not implemented");
  }
}

class RecoveryKeyDialog {
  onAction: ((actionId: string) => void) | null = null;

  constructor(
    private config: { title: string; message: string; hint?: string },
  ) {}

  show(): Promise<string | null> {
    return new Promise((resolve) => {
      this.onAction = (actionId) =>
        resolve(actionId === "submit" ? "key" : null);
    });
  }
}

class AlertDialog {
  onAction: ((actionId: string) => void) | null = null;

  constructor(
    private config: {
      title: string;
      message: string;
      actions: Array<{ id: string; label: string }>;
    },
  ) {}

  show(): Promise<string> {
    return new Promise((resolve) => {
      this.onAction = resolve;
    });
  }
}
```

---

## Error Monitoring Guidelines

Effective error monitoring is essential for maintaining service quality and security. This section outlines best practices for logging, alerting, and reporting errors while maintaining user privacy.

### Error Logging Principles

When logging errors, always balance the need for debugging information with user privacy and security. Never log sensitive data such as passwords, encryption keys, personal information, or the content of encrypted blobs.

**Always Log:**

- Error code and category
- HTTP status code
- Timestamp with precision
- Request ID for correlation
- User ID (hashed or anonymized)
- Endpoint and method
- Error frequency for aggregation

**Never Log:**

- Passwords or authentication credentials
- Encryption keys or key IDs
- Full request/response bodies for authenticated endpoints
- Credit card or payment information
- Personal identifiable information (PII)
- Email addresses or phone numbers
- Content of encrypted blobs

**Sanitize Before Logging:**

```typescript
function sanitizeForLogging(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "token",
    "key",
    "secret",
    "credential",
    "access_token",
    "refresh_token",
    "auth_token",
    "ciphertext",
    "nonce",
    "auth_tag",
    "email",
    "phone",
    "address",
    "name",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (
      sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

### Alerting Thresholds

Not all errors require immediate attention. The following guidelines help prioritize alerts based on error severity and frequency.

**Critical Alerts (Immediate):**

- AUTH-007 (Account Locked) appearing for the same user multiple times (potential brute force attack)
- CRYPT-002 (Decryption Failed) appearing at high frequency (potential data corruption or attack)
- Any error appearing at >10% of total requests for more than 5 minutes
- Complete service outage (all endpoints returning 5xx)

**Warning Alerts (Within 1 Hour):**

- Any single error code appearing at >1% of requests for more than 10 minutes
- SYNC-001 (Conflict Detected) increasing significantly (potential sync issue)
- STOR-003 (Upload Failed) or STOR-004 (Download Failed) increasing
- GEN_RATE_LIMITED errors increasing (potential abuse or misconfiguration)

**Informational (Daily Report):**

- All error counts by code and endpoint
- Average response times for error responses
- User-affected error rates by subscription tier
- Geographic distribution of errors

### Error Aggregation Strategy

Aggregate errors by multiple dimensions to identify patterns and trends. Each dimension helps diagnose different types of issues.

**By Error Code:**
Group errors by code to identify which specific issues are most common. High-frequency errors may indicate a systemic problem requiring a fix.

**By Endpoint:**
Group errors by API endpoint to identify problematic endpoints. An endpoint with a high error rate may have bugs, performance issues, or design problems.

**By User:**
Track errors per user to identify affected users. A single user with many errors may have corrupted data, multiple devices out of sync, or be experiencing targeted attacks.

**By Time:**
Track error rates over time to identify trends. Sudden increases may indicate deployment issues, external attacks, or infrastructure problems.

**Sample Aggregation Query:**

```sql
SELECT
  code,
  endpoint,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users
FROM api_errors
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY code, endpoint, hour
HAVING COUNT(*) > 100
ORDER BY error_count DESC;
```

### Error Reporting Structure

Use a consistent structure for error reports to facilitate analysis and response.

```typescript
interface ErrorReport {
  reportId: string;
  timestamp: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalErrors: number;
    uniqueUsersAffected: number;
    errorRate: number;
    topErrors: Array<{
      code: string;
      count: number;
      percentage: number;
    }>;
  };
  byCategory: {
    AUTH: { count: number; rate: number };
    SYNC: { count: number; rate: number };
    CRYPT: { count: number; rate: number };
    STOR: { count: number; rate: number };
    GEN: { count: number; rate: number };
  };
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  recommendations: string[];
}
```

### Privacy-Preserving Analytics

For privacy-preserving error analytics, use techniques that prevent identification of individual users while still providing useful aggregate data.

**Differential Privacy:**
Add controlled noise to error counts to prevent inference about individual users. For example, add random noise with standard deviation of 5 to counts before aggregation.

**K-Anonymity:**
Ensure that no error pattern is associated with fewer than k users (typically k=5 or higher). Group errors with similar characteristics to meet the threshold.

**Secure Aggregation:**
Use cryptographic techniques to aggregate error data across multiple servers without exposing individual error events. This is particularly important for distributed systems.

```typescript
interface PrivacyPreservingErrorCount {
  errorCode: string;
  minCount: number;
  maxCount: number;
  noiseLevel: number;
  isKAnonymous: boolean;
}
```

---

## HTTP Status Code Mapping

All error codes map to standard HTTP status codes for protocol compliance and compatibility with HTTP clients.

| Error Code | HTTP Status | Category             |
| ---------- | ----------- | -------------------- |
| AUTH-001   | 401         | Authentication       |
| AUTH-002   | 401         | Authentication       |
| AUTH-003   | 401         | Authentication       |
| AUTH-004   | 403         | Authorization        |
| AUTH-005   | 401         | Authentication       |
| AUTH-006   | 409         | Conflict             |
| AUTH-007   | 423         | Locked               |
| AUTH-008   | 401         | Authentication       |
| AUTH-009   | 400         | Bad Request          |
| SYNC-001   | 409         | Conflict             |
| SYNC-002   | 500         | Server Error         |
| SYNC-003   | 503         | Unavailable          |
| SYNC-004   | 503         | Unavailable          |
| SYNC-005   | 409         | Conflict             |
| SYNC-006   | 403         | Forbidden            |
| SYNC-007   | 400         | Bad Request          |
| SYNC-008   | 500         | Server Error         |
| CRYPT-001  | 404         | Not Found            |
| CRYPT-002  | 400         | Bad Request          |
| CRYPT-003  | 400         | Bad Request          |
| CRYPT-004  | 500         | Server Error         |
| CRYPT-005  | 400         | Bad Request          |
| CRYPT-006  | 400         | Bad Request          |
| CRYPT-007  | 400         | Bad Request          |
| STOR-001   | 507         | Insufficient Storage |
| STOR-002   | 404         | Not Found            |
| STOR-003   | 500         | Server Error         |
| STOR-004   | 500         | Server Error         |
| STOR-005   | 413         | Payload Too Large    |
| STOR-006   | 500         | Server Error         |
| GEN-001    | 503         | Unavailable          |
| GEN-002    | 500         | Server Error         |
| GEN-003    | 429         | Too Many Requests    |
| GEN-004    | 400         | Bad Request          |
| GEN-005    | 403         | Forbidden            |
| GEN-006    | 503         | Unavailable          |
| GEN-007    | 500         | Server Error         |
| GEN-008    | 402         | Payment Required     |

---

## Revision History

| Version | Date       | Author         | Changes                              |
| ------- | ---------- | -------------- | ------------------------------------ |
| 1.0.0   | 2026-01-19 | NoteChain Team | Initial error code taxonomy document |

---

## Related Documents

- [OpenAPI Specification](./openapi-spec.yaml) - API endpoint definitions
- [Environment Variables](../configuration/environment-variables.md) - Error-related configuration
- [Implementation Roadmap](../plans/2026-01-19-notechain-implementation-roadmap.md) - Project phases
