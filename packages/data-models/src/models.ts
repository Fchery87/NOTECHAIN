// packages/data-models/src/models.ts

// User-related models
export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  encryptedProfile?: string; // Encrypted user profile data
}

export interface UserProfile {
  displayName: string;
  timezone: string;
  workingHours: WorkingHours;
  productivityPreferences: ProductivityPreferences;
}

export interface WorkingHours {
  start: string; // "09:00"
  end: string; // "17:00"
  days: number[]; // [1,2,3,4,5] for Mon-Fri
}

export interface ProductivityPreferences {
  weeklyDigestEnabled: boolean;
  digestDay: number; // 0-6 (Sunday-Saturday)
  digestTime: string; // "08:00"
  focusTimeRecommendations: boolean;
}

// Note-related models
export interface Note {
  id: string;
  userId: string;
  title: string; // Encrypted
  content: string; // Encrypted
  contentHash: string;
  notebookId?: string;
  attachments: NoteAttachment[];
  backlinks: NoteReference[];
  tags: string[]; // Encrypted
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  encryptionKeyId: string;
  isLocked: boolean;
  isDeleted: boolean;
  syncVersion: number;
  lastModifiedBy: string;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileName: string; // Encrypted
  mimeType: string;
  sizeBytes: number;
  storageKey: string; // Reference to encrypted blob in storage
  thumbnailKey?: string;
  createdAt: Date;
}

export interface NoteReference {
  sourceNoteId: string;
  targetNoteId: string;
  context: string; // Surrounding text for context
  createdAt: Date;
}

export interface Notebook {
  id: string;
  userId: string;
  name: string; // Encrypted
  description?: string; // Encrypted
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Todo-related models
export interface Todo {
  id: string;
  userId: string;
  title: string; // Encrypted
  description?: string; // Encrypted
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[]; // Encrypted
  projectId?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  calendarEventId?: string;
  calendarProvider?: 'google' | 'outlook' | 'apple';
  linkedNoteId?: string;
  externalId?: string;
  isDeleted: boolean;
  syncVersion: number;
  lastModifiedBy: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string; // Encrypted
  description?: string; // Encrypted
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// PDF-related models
export interface PDFDocument {
  id: string;
  userId: string;
  originalFileName: string; // Encrypted
  title: string; // Encrypted
  author?: string; // Encrypted
  pageCount: number;
  fileSize: number;
  annotations: PDFAnnotation[];
  signatures: PDFSignature[];
  storageKey: string;
  thumbnailKey: string;
  encryptionKeyId: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface PDFAnnotation {
  id: string;
  pdfId: string;
  type: 'highlight' | 'underline' | 'note' | 'drawing';
  content: string; // Encrypted
  coordinates: AnnotationCoordinates;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface AnnotationCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface PDFSignature {
  id: string;
  pdfId: string;
  signatureData: string; // Encrypted signature path data
  position: SignaturePosition;
  signedAt: Date;
  isDeleted: boolean;
}

export interface SignaturePosition {
  x: number;
  y: number;
  pageNumber: number;
}

// Session-related models (replacing device model for web-only)
export interface Session {
  id: string;
  userId: string;
  sessionId: string; // Unique session identifier
  deviceInfo?: string; // Encrypted device info
  browserInfo?: string; // Encrypted browser info
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// Sync-related models
export interface SyncOperation {
  id: string;
  userId: string;
  sessionId: string;
  operationType: 'create' | 'update' | 'delete';
  entityType: 'note' | 'todo' | 'pdf' | 'notebook' | 'project';
  entityId: string;
  encryptedPayload: string; // The encrypted data
  timestamp: Date;
  isProcessed: boolean;
  processedAt?: Date;
}

export interface SyncStatus {
  id: string;
  userId: string;
  sessionId: string;
  lastSyncTime: Date;
  lastSyncVersion: number;
  pendingOperations: number;
  syncErrors: number;
}

// Encrypted blob model (for storing encrypted data)
export interface EncryptedBlob {
  id: string;
  userId: string;
  sessionId: string;
  blobType: 'note' | 'todo' | 'pdf' | 'profile' | 'attachment';
  encryptedData: string; // The actual encrypted content
  nonce: string; // For encryption
  authTag: string; // Authentication tag
  metadata: Record<string, any>; // Encrypted metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

// Subscription-related models
export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Calendar-related models
export interface ExternalEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  source: 'google' | 'outlook' | 'apple';
  externalId: string;
  calendarId?: string;
  location?: string;
  isAllDay?: boolean;
  recurrenceRule?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CalendarSync {
  id: string;
  userId: string;
  provider: 'google' | 'outlook' | 'apple';
  calendarId: string;
  calendarName: string;
  isEnabled: boolean;
  lastSyncAt?: Date;
  syncToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
