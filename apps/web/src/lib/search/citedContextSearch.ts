import { listNotes, listTodos, type EncryptedNote, type EncryptedTodo } from '../db';
import { getMeetingEncryptionKey } from '../storage/meetingEncryptionKey';
import { createMeetingStorage, type Meeting } from '../storage/meetingStorage';

export type CitedContextEntityType = 'note' | 'meeting' | 'transcript_segment' | 'task';

export interface ContextCitation {
  type: CitedContextEntityType;
  id: string;
  label: string;
  href: string;
  quote?: string;
  meetingId?: string;
  transcriptSegmentId?: string;
}

export interface CitedContextSearchResult {
  id: string;
  type: CitedContextEntityType;
  title: string;
  content: string;
  score: number;
  highlights: string[];
  updatedAt: Date;
  citation: ContextCitation;
}

export interface CitedContextSearchOptions {
  query: string;
  types?: CitedContextEntityType[];
  limit?: number;
  meetingKey?: Uint8Array;
}

interface SearchDocument {
  id: string;
  type: CitedContextEntityType;
  title: string;
  content: string;
  updatedAt: Date;
  citation: ContextCitation;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9_'-]+/i)
    .map(token => token.trim())
    .filter(Boolean);
}

function calculateScore(query: string, title: string, content: string): number {
  const normalizedQuery = normalize(query);
  const titleLower = normalize(title);
  const contentLower = normalize(content);
  const tokens = tokenize(query);

  if (!normalizedQuery || tokens.length === 0) return 0;
  if (titleLower === normalizedQuery) return 100;
  if (titleLower.includes(normalizedQuery)) return 85;
  if (contentLower.includes(normalizedQuery)) return 75;

  const searchable = `${titleLower} ${contentLower}`;
  const matchedTokens = tokens.filter(token => searchable.includes(token));
  if (matchedTokens.length === 0) return 0;

  return Math.floor((matchedTokens.length / tokens.length) * 60);
}

function highlightsFor(query: string, source: string): string[] {
  const sourceLower = normalize(source);
  return Array.from(
    new Set(
      tokenize(query)
        .filter(token => sourceLower.includes(token))
        .map(token => token)
    )
  );
}

function excerpt(value: string, maxLength: number = 220): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function noteDocument(note: EncryptedNote): SearchDocument | null {
  if (!note.id) return null;

  return {
    id: `note:${note.id}`,
    type: 'note',
    title: note.title || 'Untitled note',
    content: note.content ?? '',
    updatedAt: note.updatedAt,
    citation: {
      type: 'note',
      id: note.id,
      label: note.title || 'Untitled note',
      href: `/notes/${note.id}`,
      quote: excerpt(note.content ?? note.title),
    },
  };
}

function meetingDocument(meeting: Meeting): SearchDocument {
  return {
    id: `meeting:${meeting.id}`,
    type: 'meeting',
    title: meeting.title || 'Untitled meeting',
    content: meeting.transcript,
    updatedAt: meeting.updatedAt,
    citation: {
      type: 'meeting',
      id: meeting.id,
      label: meeting.title || 'Untitled meeting',
      href: `/meetings/${meeting.id}`,
      quote: excerpt(meeting.transcript),
      meetingId: meeting.id,
    },
  };
}

function transcriptSegmentDocuments(meeting: Meeting): SearchDocument[] {
  return meeting.actionItems.flatMap((actionItem, index) => {
    const source = actionItem.provenance?.source;
    if (!source) return [];

    const title = `${meeting.title || 'Meeting'} · source ${index + 1}`;
    return [
      {
        id: `transcript_segment:${meeting.id}:${source.segmentId}`,
        type: 'transcript_segment',
        title,
        content: source.text,
        updatedAt: meeting.updatedAt,
        citation: {
          type: 'transcript_segment',
          id: source.segmentId,
          label: title,
          href: `/meetings/${meeting.id}`,
          quote: excerpt(source.text),
          meetingId: meeting.id,
          transcriptSegmentId: source.segmentId,
        },
      },
    ];
  });
}

function taskDocument(todo: EncryptedTodo): SearchDocument | null {
  if (!todo.id) return null;

  const sourceQuote = todo.sourceText ?? todo.description ?? todo.title;
  const href = todo.sourceMeetingId ? `/meetings/${todo.sourceMeetingId}` : '/tasks';

  return {
    id: `task:${todo.id}`,
    type: 'task',
    title: todo.title || 'Untitled task',
    content: [todo.description, todo.sourceText].filter(Boolean).join('\n'),
    updatedAt: todo.updatedAt,
    citation: {
      type: 'task',
      id: todo.id,
      label: todo.title || 'Untitled task',
      href,
      quote: excerpt(sourceQuote),
      meetingId: todo.sourceMeetingId,
      transcriptSegmentId: todo.sourceTranscriptSegmentId,
    },
  };
}

async function buildSearchDocuments(
  types: CitedContextEntityType[],
  meetingKey: Uint8Array
): Promise<SearchDocument[]> {
  const [notes, meetings, todos] = await Promise.all([
    types.includes('note') ? listNotes() : Promise.resolve([]),
    types.includes('meeting') || types.includes('transcript_segment')
      ? createMeetingStorage().getAllMeetings(meetingKey)
      : Promise.resolve([]),
    types.includes('task') ? listTodos() : Promise.resolve([]),
  ]);

  const documents: SearchDocument[] = [];

  if (types.includes('note')) {
    documents.push(...notes.map(noteDocument).filter((doc): doc is SearchDocument => Boolean(doc)));
  }

  if (types.includes('meeting')) {
    documents.push(...meetings.map(meetingDocument));
  }

  if (types.includes('transcript_segment')) {
    documents.push(...meetings.flatMap(transcriptSegmentDocuments));
  }

  if (types.includes('task')) {
    documents.push(...todos.map(taskDocument).filter((doc): doc is SearchDocument => Boolean(doc)));
  }

  return documents;
}

export async function searchCitedContext({
  query,
  types = ['note', 'meeting', 'transcript_segment', 'task'],
  limit = 20,
  meetingKey,
}: CitedContextSearchOptions): Promise<CitedContextSearchResult[]> {
  if (!query.trim()) return [];

  const resolvedMeetingKey = meetingKey ?? (await getMeetingEncryptionKey());
  const documents = await buildSearchDocuments(types, resolvedMeetingKey);

  return documents
    .map(document => {
      const score = calculateScore(query, document.title, document.content);
      return {
        ...document,
        content: excerpt(document.content || document.citation.quote || ''),
        score,
        highlights: highlightsFor(query, `${document.title} ${document.content}`),
      } satisfies CitedContextSearchResult;
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}
