import type { Todo } from '@notechain/data-models';
import type { EncryptedTodo } from '../db';

export interface TaskProvenance {
  sourceType?: EncryptedTodo['sourceType'];
  sourceMeetingId?: string;
  sourceTranscriptSegmentId?: string;
  sourceText?: string;
}

export interface Task extends Todo, TaskProvenance {}

export interface CreateTaskInput extends TaskProvenance {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  dueDate?: Date;
  tags?: string[];
  linkedNoteId?: string;
  projectId?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  completedAt?: Date;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: Task['status'];
  priority?: Task['priority'];
}

export interface ListTasksFilter {
  status?: Task['status'];
  priority?: Task['priority'];
  sourceType?: EncryptedTodo['sourceType'];
  sourceMeetingId?: string;
}
