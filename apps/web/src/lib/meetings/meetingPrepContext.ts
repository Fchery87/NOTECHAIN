import { search, type SearchResult } from '../search';

export interface MeetingPrepContextInput {
  meetingTitle: string;
  calendarEventId?: string;
  limit?: number;
}

export interface MeetingPrepContext {
  source: 'manual' | 'calendar-event';
  calendarEventId?: string;
  query: string;
  relatedNotes: SearchResult[];
}

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

export async function getMeetingPrepContext({
  meetingTitle,
  calendarEventId,
  limit = 3,
}: MeetingPrepContextInput): Promise<MeetingPrepContext> {
  const query = buildMeetingPrepQuery(meetingTitle);
  const relatedNotes = query
    ? await search({
        query,
        types: ['note'],
        limit,
      })
    : [];

  return {
    source: calendarEventId ? 'calendar-event' : 'manual',
    calendarEventId,
    query,
    relatedNotes,
  };
}
