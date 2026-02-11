// @ts-nocheck
import Dexie from 'dexie';
import { KeyManager } from '@notechain/core-crypto';
import { encryptData, decryptData, type EncryptedData } from '@notechain/core-crypto';

// Database types
export interface EncryptedRecord {
  id?: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedNote extends EncryptedRecord {
  title: string;
  content?: string;
  folderId?: string;
  tags?: string[];
  linkedTodoIds?: string[];
}

export interface EncryptedTodo extends EncryptedRecord {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'completed';
  linkedNoteId?: string;
  dueDate?: Date;
  projectId?: string;
}

interface EncryptedPDF extends EncryptedRecord {
  filename: string;
  annotations: string;
  signature?: string;
}

interface EncryptedCalendarEvent extends EncryptedRecord {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  externalId?: string;
  source?: 'google' | 'outlook' | 'apple';
}

interface SyncLog {
  id?: string;
  operation: 'upload' | 'download' | 'delete';
  blobId: string;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
}

interface EncryptedFolder {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EncryptedTag {
  id?: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Device ID for key derivation
const DEVICE_ID = 'web-browser';

// Initialize Dexie database
const db = new Dexie('NoteChainDB', {
  addons: [],
});

db.version(3)
  .stores({
    notes:
      '++id, ciphertext, nonce, authTag, version, title, folderId, *tags, createdAt, updatedAt',
    todos:
      '++id, ciphertext, nonce, authTag, title, priority, status, linkedNoteId, dueDate, projectId, createdAt, updatedAt',
    pdfs: '++id, ciphertext, nonce, authTag, filename, annotations, signature, createdAt, updatedAt',
    calendarEvents:
      '++id, ciphertext, nonce, authTag, title, startDate, endDate, externalId, source, createdAt, updatedAt',
    syncLogs: '++id, operation, blobId, timestamp, success, errorMessage',
    folders: '++id, name, color, icon, parentId, *notes, createdAt, updatedAt',
    tags: '++id, name, color, *notes, createdAt, updatedAt',
    noteTagMappings: '++noteId, tagId, noteId, tagId',
  })
  .upgrade(async _trans => {
    // Migration logic handled by schema changes above
    // Dexie automatically handles table creation based on schema definition
  });

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

// Note operations
export async function createNote(note: Omit<EncryptedNote, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    title: note.title,
    content: note.content,
    folderId: note.folderId,
    tags: note.tags,
    linkedTodoIds: note.linkedTodoIds,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  });

  const id = await db.notes.add({
    ...encrypted,
    version: 1,
  });

  return id;
}

export async function getNote(id: string): Promise<EncryptedNote | undefined> {
  const encrypted = await db.notes.get(id);
  if (!encrypted) return undefined;

  return await decryptObject<EncryptedNote>(encrypted);
}

export async function updateNote(id: string, updates: Partial<EncryptedNote>): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing) throw new Error('Note not found');

  const encryptedUpdates = await encryptObject(updates);

  await db.notes.update(id, {
    ...encryptedUpdates,
    updatedAt: new Date(),
  });
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

export async function listNotes(folderId?: string): Promise<EncryptedNote[]> {
  const records = await db.notes
    .where(folderId ? { folderId } : {})
    .reverse()
    .sortBy('createdAt')
    .toArray();

  return Promise.all(records.map(r => decryptObject<EncryptedNote>(r)));
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
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  });

  const id = await db.todos.add({
    ...encrypted,
  });

  return id;
}

export async function getTodo(id: string): Promise<EncryptedTodo | undefined> {
  const encrypted = await db.todos.get(id);
  if (!encrypted) return undefined;

  return await decryptObject<EncryptedTodo>(encrypted);
}

export async function updateTodo(id: string, updates: Partial<EncryptedTodo>): Promise<void> {
  const existing = await db.todos.get(id);
  if (!existing) throw new Error('Todo not found');

  const encryptedUpdates = await encryptObject(updates);

  await db.todos.update(id, {
    ...encryptedUpdates,
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
  const collection = db.todos.toCollection();

  // Note: Filtering on encrypted data is not efficient.
  // For production, consider maintaining a separate metadata index.
  const records = await collection.toArray();
  const decrypted = await Promise.all(records.map(r => decryptObject<EncryptedTodo>(r)));

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
    createdAt: pdf.createdAt,
    updatedAt: pdf.updatedAt,
  });

  const id = await db.pdfs.add({
    ...encrypted,
  });

  return id;
}

export async function getPDF(id: string): Promise<EncryptedPDF | undefined> {
  const encrypted = await db.pdfs.get(id);
  if (!encrypted) return undefined;

  return await decryptObject<EncryptedPDF>(encrypted);
}

export async function updatePDF(id: string, updates: Partial<EncryptedPDF>): Promise<void> {
  const existing = await db.pdfs.get(id);
  if (!existing) throw new Error('PDF not found');

  const encryptedUpdates = await encryptObject(updates);

  await db.pdfs.update(id, {
    ...encryptedUpdates,
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
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  });

  const id = await db.calendarEvents.add({
    ...encrypted,
  });

  return id;
}

export async function getCalendarEvent(id: string): Promise<EncryptedCalendarEvent | undefined> {
  const encrypted = await db.calendarEvents.get(id);
  if (!encrypted) return undefined;

  return await decryptObject<EncryptedCalendarEvent>(encrypted);
}

export async function listCalendarEvents(
  startDate?: Date,
  endDate?: Date
): Promise<EncryptedCalendarEvent[]> {
  const collection = db.calendarEvents.toCollection();

  let query = collection;
  if (startDate) {
    query = query.filter(event => event.startDate >= startDate);
  }

  if (endDate) {
    query = query.filter(event => event.endDate <= endDate);
  }

  const records = await query.reverse().sortBy('startDate').toArray();
  const decrypted = await Promise.all(records.map(r => decryptObject<EncryptedCalendarEvent>(r)));

  return decrypted;
}

// Sync log operations
export async function createSyncLog(log: Omit<SyncLog, 'id'>): Promise<string> {
  const id = await db.syncLogs.add({
    ...log,
  });

  return id;
}

export async function listSyncLogs(): Promise<SyncLog[]> {
  const records = await db.syncLogs.reverse().sortBy('timestamp').toArray();
  return records;
}

// Folder operations
export async function createFolder(folder: Omit<EncryptedFolder, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    parentId: folder.parentId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  });

  const id = await db.folders.add({
    ...encrypted,
  });

  return id;
}

export async function getFolder(id: string): Promise<EncryptedFolder | undefined> {
  const encrypted = await db.folders.get(id);
  if (!encrypted) return undefined;

  return await decryptObject<EncryptedFolder>(encrypted);
}

export async function updateFolder(id: string, updates: Partial<EncryptedFolder>): Promise<void> {
  const existing = await db.folders.get(id);
  if (!existing) throw new Error('Folder not found');

  const encryptedUpdates = await encryptObject(updates);

  await db.folders.update(id, {
    ...encryptedUpdates,
    updatedAt: new Date(),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  // First, move all notes in this folder to parent or root
  const folder = await getFolder(id);
  const notes = await listNotes(id);

  for (const note of notes) {
    await updateNote(note.id!, { folderId: folder?.parentId || undefined });
  }

  // Delete folder
  await db.folders.delete(id);
}

export async function listFolders(parentId?: string): Promise<EncryptedFolder[]> {
  const collection = db.folders.toCollection();

  let query = collection;
  if (parentId !== undefined) {
    query = query.filter(folder => folder.parentId === parentId);
  } else {
    // Root folders only
    query = query.filter(folder => !folder.parentId || folder.parentId === undefined);
  }

  const records = await query.reverse().sortBy('createdAt').toArray();
  const decrypted = await Promise.all(records.map(r => decryptObject<EncryptedFolder>(r)));

  return decrypted;
}

// Tag operations
export async function createTag(tag: Omit<EncryptedTag, 'id'>): Promise<string> {
  const encrypted = await encryptObject({
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  });

  const id = await db.tags.add({
    ...encrypted,
  });

  return id;
}

export async function getTag(id: string): Promise<EncryptedTag | undefined> {
  const encrypted = await db.tags.get(id);
  if (!encrypted) return undefined;

  return await decryptObject<EncryptedTag>(encrypted);
}

export async function updateTag(id: string, updates: Partial<EncryptedTag>): Promise<void> {
  const existing = await db.tags.get(id);
  if (!existing) throw new Error('Tag not found');

  const encryptedUpdates = await encryptObject(updates);

  await db.tags.update(id, {
    ...encryptedUpdates,
    updatedAt: new Date(),
  });
}

export async function deleteTag(id: string): Promise<void> {
  // Remove tag from all notes first
  const mappings = await db.noteTagMappings.where('tagId').equals(id).toArray();
  for (const mapping of mappings) {
    await db.noteTagMappings.delete(mapping.id!);
  }

  // Delete tag
  await db.tags.delete(id);
}

export async function listTags(): Promise<EncryptedTag[]> {
  const records = await db.tags.reverse().sortBy('createdAt').toArray();
  const decrypted = await Promise.all(records.map(r => decryptObject<EncryptedTag>(r)));

  return decrypted;
}

export async function addTagToNote(noteId: string, tagId: string): Promise<void> {
  await db.noteTagMappings.add({
    noteId,
    tagId,
  });
}

export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
  const mapping = await db.noteTagMappings.where({ noteId, tagId }).first();
  if (mapping) {
    await db.noteTagMappings.delete(mapping.id!);
  }
}

export async function getTagsForNote(noteId: string): Promise<EncryptedTag[]> {
  const mappings = await db.noteTagMappings.where('noteId').equals(noteId).toArray();
  const tagIds = mappings.map(m => m.tagId);

  if (tagIds.length === 0) return [];

  const tags = await db.tags.where('id').anyOf(tagIds).toArray();
  const decrypted = await Promise.all(tags.map(r => decryptObject<EncryptedTag>(r)));

  return decrypted;
}

export async function clearDatabase(): Promise<void> {
  await db.delete();
}

export { db };
