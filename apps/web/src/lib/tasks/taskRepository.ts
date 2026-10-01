import { createTodo, deleteTodo, getTodo, listTodos, updateTodo, type EncryptedTodo } from '../db';
import type { CreateTaskInput, ListTasksFilter, Task, UpdateTaskInput } from './taskTypes';

const LOCAL_TASK_USER_ID = 'local-user';
const LOCAL_TASK_MODIFIER_ID = 'local-user';

function toTask(todo: EncryptedTodo): Task {
  return {
    id: todo.id ?? '',
    userId: LOCAL_TASK_USER_ID,
    title: todo.title,
    description: todo.description,
    status: todo.status ?? 'pending',
    priority: todo.priority ?? 'medium',
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    dueDate: todo.dueDate,
    completedAt: todo.completedAt,
    tags: todo.tags ?? [],
    projectId: todo.projectId,
    estimatedMinutes: todo.estimatedMinutes,
    actualMinutes: todo.actualMinutes,
    linkedNoteId: todo.linkedNoteId,
    isDeleted: false,
    syncVersion: todo.version,
    lastModifiedBy: LOCAL_TASK_MODIFIER_ID,
    sourceType: todo.sourceType,
    sourceMeetingId: todo.sourceMeetingId,
    sourceTranscriptSegmentId: todo.sourceTranscriptSegmentId,
    sourceText: todo.sourceText,
  };
}

function toEncryptedCreateInput(
  input: CreateTaskInput
): Omit<EncryptedTodo, 'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version'> {
  const now = new Date();

  return {
    title: input.title,
    description: input.description,
    status: input.status ?? 'pending',
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate,
    completedAt: input.completedAt,
    tags: input.tags ?? [],
    linkedNoteId: input.linkedNoteId,
    projectId: input.projectId,
    estimatedMinutes: input.estimatedMinutes,
    actualMinutes: input.actualMinutes,
    sourceType: input.sourceType,
    sourceMeetingId: input.sourceMeetingId,
    sourceTranscriptSegmentId: input.sourceTranscriptSegmentId,
    sourceText: input.sourceText,
    createdAt: now,
    updatedAt: now,
  };
}

export class LocalTaskRepository {
  async list(filter?: ListTasksFilter): Promise<Task[]> {
    const todos = await listTodos(filter);
    return todos.map(toTask);
  }

  async getById(id: string): Promise<Task | undefined> {
    const todo = await getTodo(id);
    return todo ? toTask(todo) : undefined;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const id = await createTodo(toEncryptedCreateInput(input));
    const todo = await getTodo(id);

    if (!todo) {
      throw new Error('Task not found after creation');
    }

    return toTask(todo);
  }

  async update(id: string, updates: UpdateTaskInput): Promise<Task> {
    await updateTodo(id, updates);
    const todo = await getTodo(id);

    if (!todo) {
      throw new Error('Task not found after update');
    }

    return toTask(todo);
  }

  async delete(id: string): Promise<void> {
    await deleteTodo(id);
  }
}

export const localTaskRepository = new LocalTaskRepository();
