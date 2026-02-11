'use client';

import { useState, useCallback } from 'react';
import type { Todo } from '@notechain/data-models';
import { TodoList } from '@/components/TodoList';
import { TodoForm } from '@/components/TodoForm';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useTodosSync } from '@/lib/sync/useTodosSync';

// Mock data for demonstration
const mockTodos: Todo[] = [
  {
    id: '1',
    userId: 'user-1',
    title: 'Complete NoteChain documentation',
    description: 'Write comprehensive docs for all features',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
    tags: ['docs', 'urgent'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    syncVersion: 1,
    lastModifiedBy: 'user-1',
  },
  {
    id: '2',
    userId: 'user-1',
    title: 'Review encryption implementation',
    status: 'pending',
    priority: 'critical',
    dueDate: new Date(Date.now() + 86400000), // 1 day from now
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    syncVersion: 1,
    lastModifiedBy: 'user-1',
  },
  {
    id: '3',
    userId: 'user-1',
    title: 'Update landing page copy',
    status: 'completed',
    priority: 'medium',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    syncVersion: 1,
    lastModifiedBy: 'user-1',
  },
  {
    id: '4',
    userId: 'user-1',
    title: 'Test AI note suggestions',
    description: 'Verify RAG system is working correctly',
    status: 'pending',
    priority: 'low',
    tags: ['testing'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    syncVersion: 1,
    lastModifiedBy: 'user-1',
  },
];

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>(mockTodos);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>();

  // Sync integration
  const { syncCreateTodo, syncUpdateTodo, syncToggleTodo, syncDeleteTodo, isSyncEnabled } =
    useTodosSync();

  const handleToggle = useCallback(
    async (id: string) => {
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id
            ? {
                ...todo,
                status: todo.status === 'completed' ? 'pending' : 'completed',
                updatedAt: new Date(),
              }
            : todo
        )
      );

      // Sync the toggle
      if (isSyncEnabled) {
        const todo = todos.find(t => t.id === id);
        if (todo) {
          const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
          await syncToggleTodo(id, newStatus);
        }
      }
    },
    [todos, syncToggleTodo, isSyncEnabled]
  );

  const handlePress = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setIsFormVisible(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setTodos(prev => prev.filter(todo => todo.id !== id));

      // Sync the deletion
      if (isSyncEnabled) {
        await syncDeleteTodo(id);
      }
    },
    [syncDeleteTodo, isSyncEnabled]
  );

  const handleSubmit = useCallback(
    async (todoData: {
      title: string;
      description?: string;
      dueDate?: Date;
      priority: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      estimatedMinutes?: number;
    }) => {
      if (editingTodo) {
        // Update existing
        const updatedTodo = {
          ...editingTodo,
          ...todoData,
          updatedAt: new Date(),
        };

        setTodos(prev => prev.map(todo => (todo.id === editingTodo.id ? updatedTodo : todo)));

        // Sync the update
        if (isSyncEnabled) {
          await syncUpdateTodo(updatedTodo);
        }
      } else {
        // Create new
        const newTodo: Todo = {
          id: `todo-${Date.now()}`,
          userId: 'user-1',
          ...todoData,
          tags: todoData.tags || [],
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
          syncVersion: 1,
          lastModifiedBy: 'user-1',
        };

        setTodos(prev => [newTodo, ...prev]);

        // Sync the creation
        if (isSyncEnabled) {
          await syncCreateTodo(todoData);
        }
      }

      setIsFormVisible(false);
      setEditingTodo(undefined);
    },
    [editingTodo, syncCreateTodo, syncUpdateTodo, isSyncEnabled]
  );

  const handleCloseForm = useCallback(() => {
    setIsFormVisible(false);
    setEditingTodo(undefined);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingTodo(undefined);
    setIsFormVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="font-serif text-2xl font-medium text-stone-900">
                NoteChain
              </a>
              <span className="text-stone-300">/</span>
              <span className="text-lg text-stone-700">Todos</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Sync Status Indicator */}
              <SyncStatusIndicator />

              <button
                onClick={openCreateForm}
                className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
              >
                + New Task
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200">
          <TodoList
            todos={todos}
            onToggle={handleToggle}
            onPress={handlePress}
            onDelete={handleDelete}
          />
        </div>
      </main>

      <TodoForm
        visible={isFormVisible}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        initialData={editingTodo}
        mode={editingTodo ? 'edit' : 'create'}
      />
    </div>
  );
}
