import { createCalendarAccess } from '../calendar/calendarAccess';
import { listTodos, type EncryptedTodo } from '../db';
import { noteHref, notePlainText } from '../notes/noteLinks';
import { listLocalDecryptedNotes } from '../sync/noteSyncOperations';
import type { Meeting } from '../storage/meetingStorage';
import { buildContextGraph, type ContextNote } from './contextGraph';
import type {
  CalendarEventContextResult,
  CitedContextEntityType,
  CitedContextSearchOptions,
  CitedContextSearchResult,
  ContextCitation,
  ContextGraphLocalSnapshot,
  ContextGraphQuery,
  GetContextGraphInput,
  GetRelatedContextForMeetingInput,
  RelatedContextForMeetingResult,
  TaskProvenanceContext,
} from './contextGraphQuery.types';

interface SearchDocument {
  id: string;
  type: CitedContextEntityType;
  title: string;
  content: string;
  updatedAt: Date;
  citation: ContextCitation;
}

const DEFAULT_SEARCH_TYPES: CitedContextEntityType[] = [
  'note',
  'meeting',
  'transcript_segment',
  'task',
];
const DEFAULT_MEETING_TYPES: CitedContextEntityType[] = ['note'];

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'meeting',
  'sync',
  'standup',
]);

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
  return Array.from(new Set(tokenize(query).filter(token => sourceLower.includes(token))));
}

function excerpt(value: string, maxLength: number = 220): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function noteDocument(note: ContextNote): SearchDocument | null {
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
      href: noteHref(note.id),
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

function buildSearchDocuments(
  snapshot: ContextGraphLocalSnapshot,
  types: CitedContextEntityType[]
): SearchDocument[] {
  const documents: SearchDocument[] = [];

  if (types.includes('note')) {
    documents.push(
      ...snapshot.notes
        .map(noteDocument)
        .filter((document): document is SearchDocument => Boolean(document))
    );
  }

  if (types.includes('meeting')) {
    documents.push(...snapshot.meetings.map(meetingDocument));
  }

  if (types.includes('transcript_segment')) {
    documents.push(...snapshot.meetings.flatMap(transcriptSegmentDocuments));
  }

  if (types.includes('task')) {
    documents.push(
      ...snapshot.todos
        .map(taskDocument)
        .filter((document): document is SearchDocument => Boolean(document))
    );
  }

  return documents;
}

async function listContextNotes(): Promise<ContextNote[]> {
  const notes = await listLocalDecryptedNotes();
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    content: notePlainText(note.content),
    createdAt: note.updatedAt,
    updatedAt: note.updatedAt,
  }));
}

async function loadLocalSnapshot({
  includeNotes = true,
  includeMeetings = true,
  includeTodos = true,
  includeCalendarEventShells = true,
}: {
  includeNotes?: boolean;
  includeMeetings?: boolean;
  includeTodos?: boolean;
  includeCalendarEventShells?: boolean;
} = {}): Promise<ContextGraphLocalSnapshot> {
  const calendarAccess = createCalendarAccess();
  const meetingAccessPromise = includeMeetings
    ? import('../meetings/meetingAccess').then(({ createMeetingAccess }) => createMeetingAccess())
    : Promise.resolve(null);

  const [notes, meetings, todos, calendarEventShells] = await Promise.all([
    includeNotes ? listContextNotes() : Promise.resolve([]),
    meetingAccessPromise.then(meetingAccess =>
      meetingAccess ? meetingAccess.listMeetings() : Promise.resolve([])
    ),
    includeTodos ? listTodos() : Promise.resolve([]),
    includeCalendarEventShells ? calendarAccess.listEventShells() : Promise.resolve([]),
  ]);

  return {
    notes,
    meetings,
    todos,
    calendarEventShells,
  };
}

export function buildMeetingPrepQuery(meetingTitle: string): string {
  const words = meetingTitle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));

  if (words.length === 0) {
    return meetingTitle.trim();
  }

  return Array.from(new Set(words)).join(' ');
}

async function getResolvedMeetingTitle(
  meetingTitle: string,
  calendarEventId?: string
): Promise<{ source: 'manual' | 'calendar-event'; meetingTitle: string }> {
  if (!calendarEventId) {
    return {
      source: 'manual',
      meetingTitle,
    };
  }

  const calendarEvent = await createCalendarAccess().getEventShell(calendarEventId);
  return {
    source: 'calendar-event',
    meetingTitle: calendarEvent?.title?.trim() || meetingTitle,
  };
}

export const localContextGraphQuery: ContextGraphQuery = {
  getLocalSnapshot() {
    return loadLocalSnapshot();
  },

  async getContextGraph({ baseGraph }: GetContextGraphInput = {}) {
    const snapshot = await loadLocalSnapshot();

    return buildContextGraph({
      baseGraph,
      notes: snapshot.notes,
      meetings: snapshot.meetings,
      todos: snapshot.todos,
    });
  },

  async searchCitedContext({
    query,
    types = DEFAULT_SEARCH_TYPES,
    limit = 20,
  }: CitedContextSearchOptions): Promise<CitedContextSearchResult[]> {
    if (!query.trim()) return [];

    const snapshot = await loadLocalSnapshot({
      includeNotes: types.includes('note'),
      includeMeetings: types.includes('meeting') || types.includes('transcript_segment'),
      includeTodos: types.includes('task'),
      includeCalendarEventShells: false,
    });
    const documents = buildSearchDocuments(snapshot, types);

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
      .sort(
        (left, right) =>
          right.score - left.score || right.updatedAt.getTime() - left.updatedAt.getTime()
      )
      .slice(0, limit);
  },

  async getRelatedContextForMeeting({
    meetingTitle,
    calendarEventId,
    limit = 3,
    types = DEFAULT_MEETING_TYPES,
  }: GetRelatedContextForMeetingInput): Promise<RelatedContextForMeetingResult> {
    const resolvedMeeting = await getResolvedMeetingTitle(meetingTitle, calendarEventId);
    const query = buildMeetingPrepQuery(resolvedMeeting.meetingTitle);
    const results = query
      ? await localContextGraphQuery.searchCitedContext({
          query,
          types,
          limit,
        })
      : [];

    return {
      source: resolvedMeeting.source,
      calendarEventId,
      query,
      results,
    };
  },

  async getTaskProvenance(taskId: string): Promise<TaskProvenanceContext | null> {
    const snapshot = await loadLocalSnapshot({
      includeNotes: false,
      includeMeetings: false,
      includeTodos: true,
      includeCalendarEventShells: false,
    });
    const todo = snapshot.todos.find(candidate => candidate.id === taskId);
    if (!todo?.id) return null;

    return {
      taskId: todo.id,
      citation: taskDocument(todo)?.citation,
    };
  },

  async getContextForCalendarEvent(eventId: string): Promise<CalendarEventContextResult | null> {
    const calendarAccess = createCalendarAccess();
    const eventShell = await calendarAccess.getEventShell(eventId);
    if (!eventShell) return null;

    const query = buildMeetingPrepQuery(eventShell.title || '');
    const results = query
      ? await localContextGraphQuery.searchCitedContext({
          query,
          types: DEFAULT_MEETING_TYPES,
          limit: 5,
        })
      : [];

    return {
      calendarEventId: eventId,
      query,
      eventShell,
      results,
    };
  },
};

export function createContextGraphQuery(): ContextGraphQuery {
  return localContextGraphQuery;
}

export type {
  CalendarEventContextResult,
  CitedContextEntityType,
  CitedContextSearchOptions,
  CitedContextSearchResult,
  ContextCitation,
  ContextGraphLocalSnapshot,
  ContextGraphQuery,
  GetContextGraphInput,
  GetRelatedContextForMeetingInput,
  RelatedContextForMeetingResult,
  TaskProvenanceContext,
} from './contextGraphQuery.types';
