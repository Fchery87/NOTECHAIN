import type { KnowledgeGraph } from '../ai/notes/types';
import type { EncryptedTodo } from '../db';
import type { ContextNote } from './contextGraph';
import type { CalendarEventShell } from '../calendar/calendarAccess';
import type { Meeting } from '../meetings/meetingAccess';

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

export interface GetRelatedContextForMeetingInput {
  meetingTitle: string;
  calendarEventId?: string;
  limit?: number;
  types?: CitedContextEntityType[];
}

export interface RelatedContextForMeetingResult {
  source: 'manual' | 'calendar-event';
  calendarEventId?: string;
  query: string;
  results: CitedContextSearchResult[];
}

export interface TaskProvenanceContext {
  taskId: string;
  citation?: ContextCitation;
}

export interface CalendarEventContextResult {
  calendarEventId: string;
  query: string;
  eventShell: CalendarEventShell;
  results: CitedContextSearchResult[];
}

export interface ContextGraphLocalSnapshot {
  notes: ContextNote[];
  meetings: Meeting[];
  todos: EncryptedTodo[];
  calendarEventShells: CalendarEventShell[];
}

export interface GetContextGraphInput {
  baseGraph?: KnowledgeGraph;
}

export interface ContextGraphQuery {
  getLocalSnapshot(): Promise<ContextGraphLocalSnapshot>;
  getContextGraph(input?: GetContextGraphInput): Promise<KnowledgeGraph>;
  searchCitedContext(input: CitedContextSearchOptions): Promise<CitedContextSearchResult[]>;
  getRelatedContextForMeeting(
    input: GetRelatedContextForMeetingInput
  ): Promise<RelatedContextForMeetingResult>;
  getTaskProvenance(taskId: string): Promise<TaskProvenanceContext | null>;
  getContextForCalendarEvent(eventId: string): Promise<CalendarEventContextResult | null>;
}
