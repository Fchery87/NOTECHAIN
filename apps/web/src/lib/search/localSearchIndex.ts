'use client';

import Dexie, { type Table } from 'dexie';
import { encryptedSyncService } from '@/lib/sync/encryptedSyncService';
import { listLocalNoteOperations } from '@/lib/sync/noteSyncLocalStore';

export type LocalSearchEntityType = 'note';

export interface LocalSearchDocument {
  id: string;
  userId: string;
  entityType: LocalSearchEntityType;
  entityId: string;
  title: string;
  content: string;
  searchableText: string;
  updatedAt: number;
  version: number;
}

export interface LocalSearchResult extends LocalSearchDocument {
  score: number;
  snippet: string;
  matchType: 'exact' | 'fuzzy' | 'hybrid';
}

export interface LocalSearchOptions {
  limit?: number;
  entityType?: LocalSearchEntityType;
  updatedAfter?: number;
  updatedBefore?: number;
  fuzzy?: boolean;
}

interface SyncNoteOperation {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  version: number;
}

interface SyncDeleteOperation {
  id: string;
  deleted: true;
  deletedAt: string;
  version: number;
}

export interface LocalSearchCryptoAdapter {
  decrypt(payload: string): Promise<unknown>;
}

class LocalSearchDatabase extends Dexie {
  documents!: Table<LocalSearchDocument, string>;

  constructor() {
    super('notechain-local-search-index');
    this.version(1).stores({
      documents:
        'id, userId, entityType, entityId, updatedAt, version, [userId+entityType], [userId+entityId]',
    });
  }
}

const db = new LocalSearchDatabase();

function documentId(userId: string, entityType: LocalSearchEntityType, entityId: string): string {
  return `${userId}:${entityType}:${entityId}`;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/[^a-z0-9_'-]+/i)
    .map(token => token.trim())
    .filter(Boolean);
}

function isDeleteOperation(
  value: SyncNoteOperation | SyncDeleteOperation
): value is SyncDeleteOperation {
  return 'deleted' in value && value.deleted === true;
}

function createSnippet(document: LocalSearchDocument, tokens: string[]): string {
  const source = document.content || document.title;
  const normalizedSource = source.toLowerCase();
  const firstMatch = tokens
    .map(token => normalizedSource.indexOf(token.toLowerCase()))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstMatch === undefined) {
    return source.slice(0, 180);
  }

  const start = Math.max(0, firstMatch - 60);
  const end = Math.min(source.length, firstMatch + 140);
  return `${start > 0 ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function uniqueDocumentTerms(document: LocalSearchDocument): string[] {
  return Array.from(new Set(tokenize(`${document.title} ${document.content}`)));
}

function scoreDocument(
  document: LocalSearchDocument,
  tokens: string[],
  fuzzy: boolean
): { score: number; exact: boolean; fuzzy: boolean } {
  let score = 0;
  let exactMatched = false;
  let fuzzyMatched = false;
  const title = normalizeText(document.title);
  const content = normalizeText(document.content);
  const searchable = document.searchableText;
  const terms = fuzzy ? uniqueDocumentTerms(document) : [];

  for (const token of tokens) {
    let tokenExact = false;
    if (title === token) {
      score += 20;
      tokenExact = true;
    }
    if (title.includes(token)) {
      score += 10;
      tokenExact = true;
    }
    if (content.includes(token)) {
      score += 4;
      tokenExact = true;
    }
    if (searchable.includes(token)) {
      score += 1;
      tokenExact = true;
    }

    if (tokenExact) {
      exactMatched = true;
      continue;
    }

    if (fuzzy && token.length >= 4) {
      const bestDistance = terms.reduce((best, term) => {
        if (Math.abs(term.length - token.length) > 2) return best;
        return Math.min(best, levenshteinDistance(token, term));
      }, Number.POSITIVE_INFINITY);

      if (bestDistance <= 2) {
        score += Math.max(1, 4 - bestDistance);
        fuzzyMatched = true;
      }
    }
  }

  return { score, exact: exactMatched, fuzzy: fuzzyMatched };
}

export async function upsertLocalSearchDocument(
  document: Omit<LocalSearchDocument, 'id' | 'searchableText'>
): Promise<void> {
  if (!document.userId || !document.entityId) return;

  const searchableText = normalizeText(`${document.title}\n${document.content}`);
  await db.documents.put({
    ...document,
    id: documentId(document.userId, document.entityType, document.entityId),
    searchableText,
  });
}

export async function deleteLocalSearchDocument(
  userId: string,
  entityType: LocalSearchEntityType,
  entityId: string
): Promise<void> {
  await db.documents.delete(documentId(userId, entityType, entityId));
}

export async function clearLocalSearchIndex(userId: string): Promise<void> {
  if (!userId) return;
  const docs = await db.documents.where('userId').equals(userId).toArray();
  await db.documents.bulkDelete(docs.map(doc => doc.id));
}

export async function rebuildLocalNoteSearchIndex(
  userId: string,
  cryptoAdapter: LocalSearchCryptoAdapter = encryptedSyncService
): Promise<number> {
  if (!userId) return 0;

  const records = await listLocalNoteOperations(userId);
  await clearLocalSearchIndex(userId);

  let indexed = 0;
  for (const record of records) {
    if (record.isDeleted || record.operationType === 'delete') continue;

    const decrypted = (await cryptoAdapter.decrypt(record.encryptedPayload)) as
      | SyncNoteOperation
      | SyncDeleteOperation;
    if (isDeleteOperation(decrypted)) continue;

    await upsertLocalSearchDocument({
      userId,
      entityType: 'note',
      entityId: decrypted.id || record.noteId,
      title: decrypted.title || 'Untitled',
      content: decrypted.content || '',
      updatedAt: Date.parse(decrypted.updatedAt) || record.updatedAt,
      version: decrypted.version || record.version,
    });
    indexed++;
  }

  return indexed;
}

export async function searchLocalIndex(
  userId: string,
  query: string,
  options: LocalSearchOptions = {}
): Promise<LocalSearchResult[]> {
  if (!userId || !query.trim()) return [];

  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const docs = options.entityType
    ? await db.documents.where('[userId+entityType]').equals([userId, options.entityType]).toArray()
    : await db.documents.where('userId').equals(userId).toArray();

  return docs
    .filter(
      document => options.updatedAfter === undefined || document.updatedAt >= options.updatedAfter!
    )
    .filter(
      document =>
        options.updatedBefore === undefined || document.updatedAt <= options.updatedBefore!
    )
    .map(document => {
      const score = scoreDocument(document, tokens, options.fuzzy ?? true);
      return {
        ...document,
        score: score.score,
        snippet: createSnippet(document, tokens),
        matchType: score.exact && score.fuzzy ? 'hybrid' : score.exact ? 'exact' : 'fuzzy',
      } satisfies LocalSearchResult;
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
    .slice(0, options.limit ?? 20);
}

/** Test-only escape hatch. */
export async function clearAllLocalSearchIndexData(): Promise<void> {
  await db.documents.clear();
}
