import { createContextGraphQuery } from '../graph/contextGraphQuery';
import type { SearchResult } from '../search';

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

export { buildMeetingPrepQuery } from '../graph/contextGraphQuery';

export async function getMeetingPrepContext({
  meetingTitle,
  calendarEventId,
  limit = 3,
}: MeetingPrepContextInput): Promise<MeetingPrepContext> {
  const relatedContext = await createContextGraphQuery().getRelatedContextForMeeting({
    meetingTitle,
    calendarEventId,
    limit,
    types: ['note'],
  });

  return {
    source: relatedContext.source,
    calendarEventId,
    query: relatedContext.query,
    relatedNotes: relatedContext.results.map(result => ({
      id: result.citation.id,
      type: 'note',
      title: result.title,
      content: result.content,
      score: result.score,
      highlights: result.highlights,
    })),
  };
}
