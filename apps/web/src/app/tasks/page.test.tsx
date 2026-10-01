import { beforeEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const taskPageMocks = vi.hoisted(() => ({
  listTasks: vi.fn(),
  toggleTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({
    children,
    pageTitle,
    actions,
  }: {
    children: React.ReactNode;
    pageTitle: string;
    actions?: React.ReactNode;
  }) => (
    <main>
      <h1>{pageTitle}</h1>
      {actions}
      {children}
    </main>
  ),
}));

vi.mock('@/components/PrototypeNotice', () => ({
  PrototypeNotice: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock('@/components/TodoList', () => ({
  TodoList: ({ todos, isLoading }: { todos: Array<{ title: string }>; isLoading?: boolean }) => (
    <div>
      <div data-testid="task-list-loading">{isLoading ? 'loading' : 'ready'}</div>
      {todos.map(todo => (
        <div key={todo.title}>{todo.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/TodoForm', () => ({
  TodoForm: () => null,
}));

vi.mock('@/lib/tasks/taskAdapter', () => ({
  localTaskAdapter: taskPageMocks,
}));

import TasksPage from './page';

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskPageMocks.listTasks.mockResolvedValue([
      {
        id: 'task-1',
        userId: 'local-user',
        title: 'Stored task',
        status: 'pending',
        priority: 'medium',
        tags: [],
        createdAt: new Date('2026-06-26T08:00:00.000Z'),
        updatedAt: new Date('2026-06-26T08:00:00.000Z'),
        isDeleted: false,
        syncVersion: 1,
        lastModifiedBy: 'local-user',
      },
    ]);
  });

  test('loads tasks from the local task adapter instead of route-local mock data', async () => {
    render(<TasksPage />);

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Local task storage')).toBeInTheDocument();

    await waitFor(() => {
      expect(taskPageMocks.listTasks).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Stored task')).toBeInTheDocument();
      expect(screen.getByTestId('task-list-loading')).toHaveTextContent('ready');
    });
  });
});
