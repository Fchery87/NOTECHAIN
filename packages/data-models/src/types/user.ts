// packages/data-models/src/types/user.ts

/**
 * Account tier types for subscription management
 */
export type AccountTier = 'free' | 'pro' | 'enterprise';

/**
 * User model - stores minimal identifying information
 * Sensitive profile data is stored as encrypted blobs
 */
export interface User {
  /** Unique identifier (UUID) */
  id: string;
  /** Hashed email address for lookup without exposing raw email */
  emailHash: string;
  /** User's subscription tier */
  accountTier: AccountTier;
  /** Account creation timestamp */
  createdAt: Date;
}

/**
 * EncryptedBlob model - stores all encrypted user data
 * This is the core storage model for all encrypted content
 */
export interface EncryptedBlob {
  /** Unique identifier (UUID) */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Encrypted ciphertext (base64 encoded) */
  ciphertext: string;
  /** Encryption nonce (base64 encoded) */
  nonce: string;
  /** Authentication tag for integrity verification (base64 encoded) */
  authTag: string;
  /** Reference to the encryption key used */
  keyId: string;
  /** Encryption/format version for migration support */
  version: number;
  /** Type of data stored in this blob */
  blobType: BlobType;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Types of encrypted blobs stored in the system
 */
export type BlobType = 'note' | 'todo' | 'profile' | 'attachment' | 'pdf' | 'notebook' | 'project';

/**
 * Device model - tracks user devices for multi-device sync
 */
export interface Device {
  /** Unique identifier (UUID) */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Device's public key for E2E encryption */
  publicKey: string;
  /** Human-readable device name */
  name: string;
  /** Last time this device synced */
  lastSeen: Date;
}

/**
 * Todo priority levels
 */
export type TodoPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Todo status states
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Todo model - task management entity
 * Actual content is encrypted in blobs, this is the metadata/index layer
 */
export interface Todo {
  /** Unique identifier (UUID) */
  id: string;
  /** Encrypted blob reference containing title */
  title: string;
  /** Encrypted blob reference containing description (optional) */
  description?: string;
  /** Due date for the task */
  dueDate?: Date;
  /** Priority level */
  priority: TodoPriority;
  /** Current status */
  status: TodoStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Note model - for note-taking functionality
 * Actual content is encrypted in blobs
 */
export interface Note {
  /** Unique identifier (UUID) */
  id: string;
  /** Encrypted blob reference containing title */
  title: string;
  /** Encrypted blob reference containing note content */
  content: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}
