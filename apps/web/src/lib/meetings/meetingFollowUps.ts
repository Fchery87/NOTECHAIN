import { localTaskAdapter, type Task } from '../tasks/taskAdapter';

export interface MeetingFollowUp extends Task {
  sourceType: 'meeting';
  sourceMeetingId: string;
}

export async function listMeetingFollowUps(limit: number = 5): Promise<MeetingFollowUp[]> {
  const todos = await localTaskAdapter.listTasks({ sourceType: 'meeting' });

  return todos
    .filter(
      (todo): todo is MeetingFollowUp =>
        todo.sourceType === 'meeting' &&
        typeof todo.sourceMeetingId === 'string' &&
        todo.sourceMeetingId.length > 0 &&
        todo.status !== 'completed'
    )
    .slice(0, limit);
}
