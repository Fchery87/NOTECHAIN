import { localTaskRepository } from './taskRepository';
import type { CreateTaskInput, ListTasksFilter, Task, UpdateTaskInput } from './taskTypes';

export interface TaskAdapter {
  listTasks(filter?: ListTasksFilter): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskInput): Promise<Task>;
  toggleTask(id: string): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}

export const localTaskAdapter: TaskAdapter = {
  listTasks(filter) {
    return localTaskRepository.list(filter);
  },

  getTask(id) {
    return localTaskRepository.getById(id);
  },

  createTask(input) {
    return localTaskRepository.create(input);
  },

  updateTask(id, updates) {
    return localTaskRepository.update(id, updates);
  },

  async toggleTask(id) {
    const task = await localTaskRepository.getById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const status = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = status === 'completed' ? new Date() : undefined;

    return localTaskRepository.update(id, { status, completedAt });
  },

  deleteTask(id) {
    return localTaskRepository.delete(id);
  },
};

export type { CreateTaskInput, ListTasksFilter, Task, UpdateTaskInput } from './taskTypes';
