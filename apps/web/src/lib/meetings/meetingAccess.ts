import { createMeetingStorage } from '../storage/meetingStorage';
import { getMeetingEncryptionKey } from '../storage/meetingEncryptionKey';
import { localTaskAdapter } from '../tasks/taskAdapter';
import { createTodoInputFromMeetingActionItem } from './actionItemToTodo';
import { getMeetingPrepContext } from './meetingPrepContext';
import type {
  MeetingAccess,
  MeetingInput,
  MeetingPrepContextInput,
  MeetingUpdateInput,
  PromoteMeetingActionItemInput,
} from './meetingAccess.types';

async function withMeetingKey<T>(
  operation: (storage: ReturnType<typeof createMeetingStorage>, key: Uint8Array) => Promise<T>
): Promise<T> {
  const storage = createMeetingStorage();
  const key = await getMeetingEncryptionKey();
  return operation(storage, key);
}

export const localMeetingAccess: MeetingAccess = {
  listMeetings() {
    return withMeetingKey((storage, key) => storage.getAllMeetings(key));
  },

  getMeeting(meetingId) {
    return withMeetingKey((storage, key) => storage.getMeeting(meetingId, key));
  },

  createMeeting(input: MeetingInput) {
    return withMeetingKey((storage, key) => storage.saveMeeting(input, key));
  },

  updateMeeting(meetingId, updates: MeetingUpdateInput) {
    return withMeetingKey((storage, key) => storage.updateMeeting(meetingId, updates, key));
  },

  deleteMeeting(meetingId) {
    return createMeetingStorage().deleteMeeting(meetingId);
  },

  getMeetingsByCalendarEvent(calendarEventId) {
    return withMeetingKey((storage, key) =>
      storage.getMeetingsByCalendarEvent(calendarEventId, key)
    );
  },

  getPrepContext(input: MeetingPrepContextInput) {
    return getMeetingPrepContext(input);
  },

  async promoteActionItemToTask({ meetingId, actionItemIndex }: PromoteMeetingActionItemInput) {
    const meeting = await localMeetingAccess.getMeeting(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const actionItem = meeting.actionItems[actionItemIndex];
    if (!actionItem) {
      throw new Error('Action item not found');
    }

    return localTaskAdapter.createTask(
      createTodoInputFromMeetingActionItem({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        actionItem,
      })
    );
  },
};

export function createMeetingAccess(): MeetingAccess {
  return localMeetingAccess;
}

export type {
  MeetingAccess,
  Meeting,
  MeetingInput,
  MeetingPrepContext,
  MeetingPrepContextInput,
  MeetingUpdateInput,
  PromoteMeetingActionItemInput,
} from './meetingAccess.types';
