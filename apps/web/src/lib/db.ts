import Dexie, { type EntityTable } from 'dexie';
import { KeyManager } from '@notechain/core-crypto';
import { encryptData, decryptData, type EncryptedData } from '@notechain/core-crypto';

// Raw database record types (what's actually stored in IndexedDB)
interface NoteRecord {
  id: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TodoRecord {
  id: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PDFRecord {
  id: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CalendarEventRecord {
  id: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FolderRecord {
  id: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TagRecord {
  id: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncLogRecord {
  id: string;
  operation: 'upload' | 'download' | 'delete';
  blobId: string;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
}

interface NoteTagMapping {
  id: string;
  noteId: string;
  tagId: string;
}

// Decrypted data types (what the application works with)
export interface EncryptedNote {
  id?: string;
  title: string;
  content?: string;
  folderId?: string;
  tags?: string[];
  linkedTodoIds?: string[];
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedTodo {
  id?: string;
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'completed';
  linkedNoteId?: string;
  dueDate?: Date;
  projectId?: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface EncryptedPDF {
  id?: string;
  filename: string;
  annotations: string;
  signature?: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface EncryptedCalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  externalId?: string;
  source?: 'google' | 'outlook' | 'apple';
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface EncryptedFolder {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
  parentId?: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface EncryptedTag {
  id?: string;
  name: string;
  color?: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Typed Dexie database
const db = new Dexie('NoteChainDB') as Dexie & {
  notes: EntityTable<NoteRecord, 'id'>;
  todos: EntityTable<TodoRecord, 'id'>;
  pdfs: EntityTable<PDFRecord, 'id'>;
  calendarEvents: EntityTable<CalendarEventRecord, 'id'>;
  syncLogs: EntityTable<SyncLogRecord, 'id'>;
  folders: EntityTable<FolderRecord, 'id'>;
  tags: EntityTable<TagRecord, 'id'>;
  noteTagMappings: EntityTable<NoteTagMapping, 'id'>;
};

db.version(3).stores({
  notes: 'id, ciphertext, nonce, authTag, version, createdAt, updatedAt',
  todos: 'id, ciphertext, nonce, authTag, version, createdAt, updatedAt',
  pdfs: 'id, ciphertext, nonce, authTag, version, createdAt, updatedAt',
  calendarEvents: 'id, ciphertext, nonce, authTag, version, createdAt, updatedAt',
  syncLogs: 'id, operation, blobId, timestamp, success, errorMessage',
  folders: 'id, ciphertext, nonce, authTag, version, createdAt, updatedAt',
  tags: 'id, ciphertext, nonce, authTag, version, createdAt, updatedAt',
  noteTagMappings: 'id, noteId, tagId',
});

// Device ID for key derivation
const DEVICE_ID = 'web-browser';

// Get encryption key
async function getEncryptionKey(): Promise<Uint8Array> {
  const masterKey = await KeyManager.getMasterKey();
  if (!masterKey) {
    throw new Error('Master key not found. User must be logged in.');
  }

  return await KeyManager.deriveDeviceKey(DEVICE_ID, masterKey);
}

// Helper functions for encryption/decryption
async function encryptObject<T>(obj: T): Promise<EncryptedData> {
  const json = JSON.stringify(obj);
  const key = await getEncryptionKey();
  return await encryptData(json, key);
}

async function decryptObject<T>(encrypted: EncryptedData): Promise<T> {
  const key = await getEncryptionKey();
  const decrypted = await decryptData(encrypted, key);
  return JSON.parse(decrypted) as T;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Note operations
export async function createNote(note: Omit<EncryptedNote, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    title: note.title,
    content: note.content,
    folderId: note.folderId,
    tags: note.tags,
    linkedTodoIds: note.linkedTodoIds,
  });

  const id = generateId();
  const now = new Date();
  await db.notes.add({
    id,
    ...encrypted,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getNote(id: string): Promise<EncryptedNote | undefined> {
  const record = await db.notes.get(id);
  if (!record) return undefined;

  const decrypted =
    await decryptObject<
      Omit<
        EncryptedNote,
        'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
      >
    >(record);

  return {
    id: record.id,
    ...decrypted,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    authTag: record.authTag,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function updateNote(id: string, updates: Partial<EncryptedNote>): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing) throw new Error('Note not found');

  const encrypted = await encryptObject({
    title: updates.title,
    content: updates.content,
    folderId: updates.folderId,
    tags: updates.tags,
    linkedTodoIds: updates.linkedTodoIds,
  });

  await db.notes.update(id, {
    ...encrypted,
    updatedAt: new Date(),
  });
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

export async function listNotes(_folderId?: string): Promise<EncryptedNote[]> {
  const records = await db.notes.orderBy('createdAt').reverse().toArray();

  return Promise.all(
    records.map(async record => {
      const decrypted =
        await decryptObject<
          Omit<
            EncryptedNote,
            'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
          >
        >(record);
      return {
        id: record.id,
        ...decrypted,
        ciphertext: record.ciphertext,
        nonce: record.nonce,
        authTag: record.authTag,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    })
  );
}

// Todo operations
export async function createTodo(todo: Omit<EncryptedTodo, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    status: todo.status,
    linkedNoteId: todo.linkedNoteId,
    dueDate: todo.dueDate,
    projectId: todo.projectId,
  });

  const id = generateId();
  const now = new Date();
  await db.todos.add({
    id,
    ...encrypted,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getTodo(id: string): Promise<EncryptedTodo | undefined> {
  const record = await db.todos.get(id);
  if (!record) return undefined;

  const decrypted =
    await decryptObject<
      Omit<
        EncryptedTodo,
        'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
      >
    >(record);

  return {
    id: record.id,
    ...decrypted,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    authTag: record.authTag,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function updateTodo(id: string, updates: Partial<EncryptedTodo>): Promise<void> {
  const existing = await db.todos.get(id);
  if (!existing) throw new Error('Todo not found');

  const encrypted = await encryptObject({
    title: updates.title,
    description: updates.description,
    priority: updates.priority,
    status: updates.status,
    linkedNoteId: updates.linkedNoteId,
    dueDate: updates.dueDate,
    projectId: updates.projectId,
  });

  await db.todos.update(id, {
    ...encrypted,
    updatedAt: new Date(),
  });
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.delete(id);
}

export async function listTodos(filter?: {
  status?: string;
  priority?: string;
}): Promise<EncryptedTodo[]> {
  const records = await db.todos.toArray();
  const decrypted = await Promise.all(
    records.map(async record => {
      const data =
        await decryptObject<
          Omit<
            EncryptedTodo,
            'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
          >
        >(record);
      return {
        id: record.id,
        ...data,
        ciphertext: record.ciphertext,
        nonce: record.nonce,
        authTag: record.authTag,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    })
  );

  let filtered = decrypted;
  if (filter?.status) {
    filtered = filtered.filter(todo => todo.status === filter.status);
  }

  if (filter?.priority) {
    filtered = filtered.filter(todo => todo.priority === filter.priority);
  }

  return filtered.reverse().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// PDF operations
export async function createPDF(pdf: Omit<EncryptedPDF, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    filename: pdf.filename,
    annotations: pdf.annotations,
    signature: pdf.signature,
  });

  const id = generateId();
  const now = new Date();
  await db.pdfs.add({
    id,
    ...encrypted,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getPDF(id: string): Promise<EncryptedPDF | undefined> {
  const record = await db.pdfs.get(id);
  if (!record) return undefined;

  const decrypted =
    await decryptObject<
      Omit<
        EncryptedPDF,
        'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
      >
    >(record);

  return {
    id: record.id,
    ...decrypted,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    authTag: record.authTag,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function updatePDF(id: string, updates: Partial<EncryptedPDF>): Promise<void> {
  const existing = await db.pdfs.get(id);
  if (!existing) throw new Error('PDF not found');

  const encrypted = await encryptObject({
    filename: updates.filename,
    annotations: updates.annotations,
    signature: updates.signature,
  });

  await db.pdfs.update(id, {
    ...encrypted,
    updatedAt: new Date(),
  });
}

export async function deletePDF(id: string): Promise<void> {
  await db.pdfs.delete(id);
}

// Calendar event operations
export async function createCalendarEvent(
  event: Omit<EncryptedCalendarEvent, 'id'>
): Promise<string> {
  const encrypted = await encryptObject({
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    externalId: event.externalId,
    source: event.source,
  });

  const id = generateId();
  const now = new Date();
  await db.calendarEvents.add({
    id,
    ...encrypted,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getCalendarEvent(id: string): Promise<EncryptedCalendarEvent | undefined> {
  const record = await db.calendarEvents.get(id);
  if (!record) return undefined;

  const decrypted =
    await decryptObject<
      Omit<
        EncryptedCalendarEvent,
        'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
      >
    >(record);

  return {
    id: record.id,
    ...decrypted,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    authTag: record.authTag,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listCalendarEvents(
  startDate?: Date,
  endDate?: Date
): Promise<EncryptedCalendarEvent[]> {
  const records = await db.calendarEvents.orderBy('createdAt').reverse().toArray();

  const decrypted = await Promise.all(
    records.map(async record => {
      const data =
        await decryptObject<
          Omit<
            EncryptedCalendarEvent,
            'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
          >
        >(record);
      return {
        id: record.id,
        ...data,
        ciphertext: record.ciphertext,
        nonce: record.nonce,
        authTag: record.authTag,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    })
  );

  if (startDate) {
    return decrypted.filter(event => event.startDate >= startDate);
  }

  if (endDate) {
    return decrypted.filter(event => event.endDate <= endDate);
  }

  return decrypted;
}

// Sync log operations
export async function createSyncLog(log: Omit<SyncLogRecord, 'id'>): Promise<string> {
  const id = generateId();
  await db.syncLogs.add({
    id,
    ...log,
  });

  return id;
}

export async function listSyncLogs(): Promise<SyncLogRecord[]> {
  const records = await db.syncLogs.orderBy('timestamp').reverse().toArray();
  return records;
}

// Folder operations
export async function createFolder(folder: Omit<EncryptedFolder, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    parentId: folder.parentId,
  });

  const id = generateId();
  const now = new Date();
  await db.folders.add({
    id,
    ...encrypted,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getFolder(id: string): Promise<EncryptedFolder | undefined> {
  const record = await db.folders.get(id);
  if (!record) return undefined;

  const decrypted =
    await decryptObject<
      Omit<
        EncryptedFolder,
        'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
      >
    >(record);

  return {
    id: record.id,
    ...decrypted,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    authTag: record.authTag,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function updateFolder(id: string, updates: Partial<EncryptedFolder>): Promise<void> {
  const existing = await db.folders.get(id);
  if (!existing) throw new Error('Folder not found');

  const encrypted = await encryptObject({
    name: updates.name,
    color: updates.color,
    icon: updates.icon,
    parentId: updates.parentId,
  });

  await db.folders.update(id, {
    ...encrypted,
    updatedAt: new Date(),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  // First, move all notes in this folder to parent or root
  const folder = await getFolder(id);
  const notes = await listNotes(id);

  for (const note of notes) {
    if (note.id) {
      await updateNote(note.id, { folderId: folder?.parentId || undefined });
    }
  }

  // Delete folder
  await db.folders.delete(id);
}

export async function listFolders(parentId?: string): Promise<EncryptedFolder[]> {
  const records = await db.folders.toArray();
  const decrypted = await Promise.all(
    records.map(async record => {
      const data =
        await decryptObject<
          Omit<
            EncryptedFolder,
            'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
          >
        >(record);
      return {
        id: record.id,
        ...data,
        ciphertext: record.ciphertext,
        nonce: record.nonce,
        authTag: record.authTag,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    })
  );

  if (parentId !== undefined) {
    return decrypted.filter(folder => folder.parentId === parentId);
  } else {
    // Root folders only
    return decrypted.filter(folder => !folder.parentId);
  }
}

// Tag operations
export async function createTag(tag: Omit<EncryptedTag, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    name: tag.name,
    color: tag.color,
  });

  const id = generateId();
  const now = new Date();
  await db.tags.add({
    id,
    ...encrypted,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getTag(id: string): Promise<EncryptedTag | undefined> {
  const record = await db.tags.get(id);
  if (!record) return undefined;

  const decrypted =
    await decryptObject<
      Omit<
        EncryptedTag,
        'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
      >
    >(record);

  return {
    id: record.id,
    ...decrypted,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    authTag: record.authTag,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function updateTag(id: string, updates: Partial<EncryptedTag>): Promise<void> {
  const existing = await db.tags.get(id);
  if (!existing) throw new Error('Tag not found');

  const encrypted = await encryptObject({
    name: updates.name,
    color: updates.color,
  });

  await db.tags.update(id, {
    ...encrypted,
    updatedAt: new Date(),
  });
}

export async function deleteTag(id: string): Promise<void> {
  // Remove tag from all notes first
  const mappings = await db.noteTagMappings.where('tagId').equals(id).toArray();
  for (const mapping of mappings) {
    await db.noteTagMappings.delete(mapping.id);
  }

  // Delete tag
  await db.tags.delete(id);
}

export async function listTags(): Promise<EncryptedTag[]> {
  const records = await db.tags.orderBy('createdAt').reverse().toArray();
  const decrypted = await Promise.all(
    records.map(async record => {
      const data =
        await decryptObject<
          Omit<
            EncryptedTag,
            'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
          >
        >(record);
      return {
        id: record.id,
        ...data,
        ciphertext: record.ciphertext,
        nonce: record.nonce,
        authTag: record.authTag,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    })
  );

  return decrypted;
}

export async function addTagToNote(noteId: string, tagId: string): Promise<void> {
  const id = generateId();
  await db.noteTagMappings.add({
    id,
    noteId,
    tagId,
  });
}

export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
  const mapping = await db.noteTagMappings.where({ noteId, tagId }).first();
  if (mapping) {
    await db.noteTagMappings.delete(mapping.id);
  }
}

export async function getTagsForNote(noteId: string): Promise<EncryptedTag[]> {
  const mappings = await db.noteTagMappings.where('noteId').equals(noteId).toArray();
  const tagIds = mappings.map(m => m.tagId);

  if (tagIds.length === 0) return [];

  const records = await db.tags.where('id').anyOf(tagIds).toArray();
  const decrypted = await Promise.all(
    records.map(async record => {
      const data =
        await decryptObject<
          Omit<
            EncryptedTag,
            'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version' | 'createdAt' | 'updatedAt'
          >
        >(record);
      return {
        id: record.id,
        ...data,
        ciphertext: record.ciphertext,
        nonce: record.nonce,
        authTag: record.authTag,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    })
  );

  return decrypted;
}

export async function clearDatabase(): Promise<void> {
  await db.delete();
}

export { db };
