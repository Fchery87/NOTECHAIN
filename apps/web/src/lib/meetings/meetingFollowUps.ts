import { listTodos, type EncryptedTodo } from '../db';

export interface MeetingFollowUp extends EncryptedTodo {
  sourceType: 'meeting';
  sourceMeetingId: string;
}

export async function listMeetingFollowUps(limit: number = 5): Promise<MeetingFollowUp[]> {
  const todos = await listTodos({ sourceType: 'meeting' });

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
