export interface UserAccount {
  id: string;
  emailHash: string;
  accountTier: 'free' | 'pro';
  subscriptionStatus: 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: Date | null;
  deviceLimit: number;
  createdAt: Date;
}

export interface UserProfile {
  displayName: string;
  avatarHash: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
    days: number[];
  };
  productivityPreferences: {
    weeklyDigestEnabled: boolean;
    digestDay: number;
    digestTime: string;
    focusTimeRecommendations: boolean;
  };
}

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  completedAt: string | null;
  tags: string[];
  projectId: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  calendarEventId: string | null;
  syncVersion: number;
  lastModifiedBy: string;
  isDeleted: boolean;
}

export interface Note {
  id: string;
  userId: string;
  notebookId: string | null;
  title: string;
  content: string;
  contentHash: string;
  attachments: NoteAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  encryptionKeyId: string;
  isLocked: boolean;
  syncVersion: number;
  lastModifiedBy: string;
  isDeleted: boolean;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  thumbnailKey: string | null;
  createdAt: string;
}

export interface PDFDocument {
  id: string;
  userId: string;
  originalFileName: string;
  title: string;
  author: string | null;
  pageCount: number;
  fileSize: number;
  annotations: PDFAnnotation[];
  signatures: PDFSignature[];
  storageKey: string;
  thumbnailKey: string;
  encryptionKeyId: string;
  syncVersion: number;
  lastModifiedBy: string;
  isDeleted: boolean;
}

export interface PDFAnnotation {
  id: string;
  pdfId: string;
  type: 'highlight' | 'underline' | 'freehand' | 'text';
  pageNumber: number;
  rect: number[];
  content: string | null;
  color: string;
  createdAt: string;
}

export interface PDFSignature {
  id: string;
  pdfId: string;
  pageNumber: number;
  rect: number[];
  signatureData: string;
  signerEmail: string;
  signedAt: string;
}

export interface Notebook {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  syncVersion: number;
  isDeleted: boolean;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  syncVersion: number;
  isDeleted: boolean;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'web' | 'desktop';
  publicExchangeKey: Uint8Array;
  encryptedSharedSecret: Uint8Array;
  lastSeen: string;
  isTrusted: boolean;
  createdAt: string;
}

export interface SyncMetadata {
  id: string;
  userId: string;
  entityType: 'note' | 'todo' | 'pdf' | 'notebook' | 'project';
  entityId: string;
  syncVersion: number;
  lastSyncedAt: string;
  isDeleted: boolean;
}
