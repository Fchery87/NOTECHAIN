import type { ActionItem } from '../ai/transcription/actionItemExtractor';
import type { Meeting, MeetingInput } from '../storage/meetingStorage';
import type { MeetingPrepContext, MeetingPrepContextInput } from './meetingPrepContext';
import type { Task } from '../tasks/taskAdapter';

export type MeetingUpdateInput = Partial<Omit<MeetingInput, 'actionItems'>> & {
  actionItems?: ActionItem[];
};

export interface PromoteMeetingActionItemInput {
  meetingId: string;
  actionItemIndex: number;
}

export interface MeetingAccess {
  listMeetings(): Promise<Meeting[]>;
  getMeeting(meetingId: string): Promise<Meeting | null>;
  createMeeting(input: MeetingInput): Promise<Meeting>;
  updateMeeting(meetingId: string, updates: MeetingUpdateInput): Promise<Meeting>;
  deleteMeeting(meetingId: string): Promise<void>;
  getMeetingsByCalendarEvent(calendarEventId: string): Promise<Meeting[]>;
  getPrepContext(input: MeetingPrepContextInput): Promise<MeetingPrepContext>;
  promoteActionItemToTask(input: PromoteMeetingActionItemInput): Promise<Task>;
}

export type { Meeting, MeetingInput, MeetingPrepContext, MeetingPrepContextInput, Task };
