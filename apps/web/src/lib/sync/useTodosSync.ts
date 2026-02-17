'use client';

import { useCallback, useRef } from 'react';
import { useSync } from './SyncProvider';
import type { Todo } from '@notechain/data-models';
import { v4 as uuidv4 } from 'uuid';

interface SyncTodoOperation {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  updatedAt: string;
  version: number;
}

/**
 * Hook to sync todo operations
 * Wraps todo CRUD operations with sync functionality
 */
export function useTodosSync() {
  const { syncService, isInitialized } = useSync();
  const versionRef = useRef<Record<string, number>>({});

  const getNextVersion = useCallback((todoId: string): number => {
    const currentVersion = versionRef.current[todoId] || 0;
    versionRef.current[todoId] = currentVersion + 1;
    return versionRef.current[todoId];
  }, []);

  /**
   * Sync a todo creation
   */
  const syncCreateTodo = useCallback(
    async (todo: {
      title: string;
      description?: string;
      dueDate?: Date;
      priority: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      estimatedMinutes?: number;
    }): Promise<string> => {
      const todoId = uuidv4();
      const version = 1;
      versionRef.current[todoId] = version;

      if (syncService && isInitialized) {
        const todoData: SyncTodoOperation = {
          id: todoId,
          title: todo.title,
          description: todo.description,
          status: 'pending',
          priority: todo.priority,
          dueDate: todo.dueDate?.toISOString(),
          updatedAt: new Date().toISOString(),
          version,
        };

        const payload = btoa(JSON.stringify(todoData));
        const mockCiphertext = `${payload}:nonce:authTag`;

        await syncService.enqueueOperation({
          operationType: 'create',
          entityType: 'todo',
          entityId: todoId,
          encryptedPayload: mockCiphertext,
          version,
        });
      }

      return todoId;
    },
    [syncService, isInitialized, getNextVersion]
  );

  /**
   * Sync a todo update
   */
  const syncUpdateTodo = useCallback(
    async (todo: Todo): Promise<void> => {
      if (syncService && isInitialized) {
        const version = getNextVersion(todo.id);

        const todoData: SyncTodoOperation = {
          id: todo.id,
          title: todo.title,
          description: todo.description,
          status: todo.status,
          priority: todo.priority,
          dueDate: todo.dueDate?.toISOString(),
          updatedAt: new Date().toISOString(),
          version,
        };

        const payload = btoa(JSON.stringify(todoData));
        const mockCiphertext = `${payload}:nonce:authTag`;

        await syncService.enqueueOperation({
          operationType: 'update',
          entityType: 'todo',
          entityId: todo.id,
          encryptedPayload: mockCiphertext,
          version,
        });
      }
    },
    [syncService, isInitialized, getNextVersion]
  );

  /**
   * Sync a todo toggle (status change)
   */
  const syncToggleTodo = useCallback(
    async (todoId: string, newStatus: string): Promise<void> => {
      if (syncService && isInitialized) {
        const version = getNextVersion(todoId);

        const toggleData = {
          id: todoId,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          version,
        };

        const payload = btoa(JSON.stringify(toggleData));
        const mockCiphertext = `${payload}:nonce:authTag`;

        await syncService.enqueueOperation({
          operationType: 'update',
          entityType: 'todo',
          entityId: todoId,
          encryptedPayload: mockCiphertext,
          version,
        });
      }
    },
    [syncService, isInitialized, getNextVersion]
  );

  /**
   * Sync a todo deletion
   */
  const syncDeleteTodo = useCallback(
    async (todoId: string): Promise<void> => {
      if (syncService && isInitialized) {
        const version = getNextVersion(todoId);

        await syncService.enqueueOperation({
          operationType: 'delete',
          entityType: 'todo',
          entityId: todoId,
          encryptedPayload: 'deleted:nonce:authTag',
          version,
        });
      }
    },
    [syncService, isInitialized, getNextVersion]
  );

  return {
    syncCreateTodo,
    syncUpdateTodo,
    syncToggleTodo,
    syncDeleteTodo,
    isSyncEnabled: isInitialized && !!syncService,
  };
}
