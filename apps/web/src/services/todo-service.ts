// apps/web/src/services/todo-service.ts
import { TodoRepository, createTodoRepository } from '../lib/repositories/TodoRepository';
import { SyncRepository, createSyncRepository } from '../lib/repositories/SyncRepository';
import type { Todo } from '@notechain/data-models';
import type { SyncOperation } from '@notechain/sync-engine';

/**
 * Input for creating a new todo
 */
export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: Todo['priority'];
  dueDate?: Date;
  tags?: string[];
  projectId?: string;
  estimatedMinutes?: number;
}

/**
 * Input for updating a todo
 */
export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: Todo['status'];
  priority?: Todo['priority'];
  dueDate?: Date;
  tags?: string[];
  projectId?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
}

/**
 * Options for listing todos
 */
export interface ListTodosOptions {
  status?: Todo['status'];
  priority?: Todo['priority'];
  projectId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  limit?: number;
  offset?: number;
}

/**
 * TodoService provides business logic for task management
 * Coordinates between encryption, storage, and sync
 */
export class TodoService {
  private todoRepository: TodoRepository;
  private syncRepository: SyncRepository;
  private userId: string;
  private encryptionKey: Uint8Array;
  private deviceId: string;

  constructor(userId: string, encryptionKey: Uint8Array, deviceId?: string) {
    this.userId = userId;
    this.encryptionKey = encryptionKey;
    this.deviceId = deviceId ?? `device_${Date.now()}`;
    this.todoRepository = createTodoRepository(userId, encryptionKey);
    this.syncRepository = createSyncRepository(this.deviceId);
  }

  /**
   * Create a new todo
   * FR-TODO-01: Create, edit, delete tasks
   */
  async createTodo(input: CreateTodoInput): Promise<Todo> {
    const todo = await this.todoRepository.create({
      userId: this.userId,
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate,
      tags: input.tags ?? [],
      projectId: input.projectId,
      estimatedMinutes: input.estimatedMinutes,
      isDeleted: false,
      lastModifiedBy: this.userId,
    });

    // Queue sync operation by updating the blob
    await this.pushToSync(todo, 'create');

    return todo;
  }

  /**
   * Get a todo by ID
   */
  async getTodo(todoId: string): Promise<Todo | null> {
    return this.todoRepository.getById(todoId);
  }

  /**
   * List todos with optional filters
   */
  async listTodos(options?: ListTodosOptions): Promise<Todo[]> {
    if (options?.status) {
      return this.todoRepository.getByStatus(options.status);
    }

    if (options?.projectId) {
      return this.todoRepository.getByProjectId(options.projectId);
    }

    if (options?.dueBefore || options?.dueAfter) {
      const startDate = options.dueAfter ?? new Date(0);
      const endDate = options.dueBefore ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      return this.todoRepository.getByDueDateRange(startDate, endDate);
    }

    return this.todoRepository.getAll(options?.limit, options?.offset);
  }

  /**
   * Update a todo
   * FR-TODO-01: Create, edit, delete tasks
   */
  async updateTodo(todoId: string, input: UpdateTodoInput): Promise<Todo | null> {
    const todo = await this.todoRepository.update(todoId, input);

    if (todo) {
      // Queue sync operation
      await this.pushToSync(todo, 'update');
    }

    return todo;
  }

  /**
   * Delete a todo (soft delete)
   * FR-TODO-01: Create, edit, delete tasks
   */
  async deleteTodo(todoId: string): Promise<boolean> {
    const success = await this.todoRepository.delete(todoId);

    if (success) {
      // Queue sync operation for deletion
      await this.pushDeleteToSync(todoId);
    }

    return success;
  }

  /**
   * Toggle todo completion status
   * FR-TODO-02: Mark tasks as complete/incomplete
   */
  async toggleComplete(todoId: string): Promise<Todo | null> {
    const todo = await this.todoRepository.getById(todoId);
    if (!todo) return null;

    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    return this.updateTodo(todoId, { status: newStatus });
  }

  /**
   * Mark todo as in progress
   */
  async startProgress(todoId: string): Promise<Todo | null> {
    return this.updateTodo(todoId, { status: 'in_progress' });
  }

  /**
   * Get pending todos
   */
  async getPendingTodos(): Promise<Todo[]> {
    return this.todoRepository.getPending();
  }

  /**
   * Get overdue todos
   * FR-TODO-03: Overdue task highlighting
   */
  async getOverdueTodos(): Promise<Todo[]> {
    return this.todoRepository.getOverdue();
  }

  /**
   * Get todos due today
   */
  async getTodosDueToday(): Promise<Todo[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.todoRepository.getByDueDateRange(today, tomorrow);
  }

  /**
   * Get todos due this week
   */
  async getTodosDueThisWeek(): Promise<Todo[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.todoRepository.getByDueDateRange(today, weekEnd);
  }

  /**
   * Update todo priority
   */
  async updatePriority(todoId: string, priority: Todo['priority']): Promise<Todo | null> {
    return this.updateTodo(todoId, { priority });
  }

  /**
   * Update todo due date
   */
  async updateDueDate(todoId: string, dueDate: Date | undefined): Promise<Todo | null> {
    return this.updateTodo(todoId, { dueDate });
  }

  /**
   * Add tags to todo
   */
  async addTags(todoId: string, tags: string[]): Promise<Todo | null> {
    const todo = await this.todoRepository.getById(todoId);
    if (!todo) return null;

    const uniqueTags = Array.from(new Set([...todo.tags, ...tags]));
    return this.updateTodo(todoId, { tags: uniqueTags });
  }

  /**
   * Remove tags from todo
   */
  async removeTags(todoId: string, tags: string[]): Promise<Todo | null> {
    const todo = await this.todoRepository.getById(todoId);
    if (!todo) return null;

    const filteredTags = todo.tags.filter(t => !tags.includes(t));
    return this.updateTodo(todoId, { tags: filteredTags });
  }

  /**
   * Get todo count by status
   */
  async getTodoCounts(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    const [total, pending, completed, overdue] = await Promise.all([
      this.todoRepository.count(),
      this.todoRepository.getByStatus('pending').then(t => t.length),
      this.todoRepository.getByStatus('completed').then(t => t.length),
      this.todoRepository.getOverdue().then(t => t.length),
    ]);

    const inProgress = await this.todoRepository.getByStatus('in_progress');

    return {
      total,
      pending,
      inProgress: inProgress.length,
      completed,
      overdue,
    };
  }

  /**
   * Push todo to external calendar
   * FR-TODO-05: Calendar integration
   */
  async pushToCalendar(
    todoId: string,
    provider: 'google' | 'outlook' | 'apple',
    accessToken: string,
    calendarId: string = 'primary'
  ): Promise<string | null> {
    const todo = await this.todoRepository.getById(todoId);
    if (!todo || !todo.dueDate) return null;

    const { CalendarService } = await import('./calendar-service');

    const eventId = await CalendarService.pushToExternalCalendar(
      {
        id: todo.id,
        title: todo.title,
        dueDate: todo.dueDate,
      },
      calendarId,
      provider,
      accessToken
    );

    // Store calendar event reference
    await this.todoRepository.update(todoId, {
      calendarEventId: eventId,
      calendarProvider: provider,
    });

    return eventId;
  }

  /**
   * Subscribe to real-time todo changes
   */
  subscribeToChanges(onChange: (todo: SyncOperation) => void): () => void {
    return this.syncRepository.subscribeToChanges(this.userId, onChange);
  }

  // Private helper methods

  /**
   * Push todo changes to sync
   */
  private async pushToSync(todo: Todo, operationType: 'create' | 'update'): Promise<void> {
    const operation: SyncOperation = {
      id: `${todo.id}_${Date.now()}`,
      userId: this.userId,
      sessionId: this.deviceId,
      operationType,
      entityType: 'todo',
      entityId: todo.id,
      encryptedPayload: JSON.stringify(todo),
      timestamp: Date.now(),
      version: todo.syncVersion,
    };

    await this.syncRepository.pushOperations([operation]);
  }

  /**
   * Push delete operation to sync
   */
  private async pushDeleteToSync(todoId: string): Promise<void> {
    const operation: SyncOperation = {
      id: `${todoId}_delete_${Date.now()}`,
      userId: this.userId,
      sessionId: this.deviceId,
      operationType: 'delete',
      entityType: 'todo',
      entityId: todoId,
      encryptedPayload: '',
      timestamp: Date.now(),
      version: 0,
    };

    await this.syncRepository.pushOperations([operation]);
  }
}

/**
 * Factory function to create a TodoService instance
 */
export function createTodoService(
  userId: string,
  encryptionKey: Uint8Array,
  deviceId?: string
): TodoService {
  return new TodoService(userId, encryptionKey, deviceId);
}
