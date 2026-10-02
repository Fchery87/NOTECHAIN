'use client';

import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { PrototypeNotice } from '@/components/PrototypeNotice';
import { TodoList } from '@/components/TodoList';
import { TodoForm } from '@/components/TodoForm';
import {
  localTaskAdapter,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from '@/lib/tasks/taskAdapter';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const loadTasks = useCallback(async () => {
    const nextTasks = await localTaskAdapter.listTasks();
    setTasks(nextTasks);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const nextTasks = await localTaskAdapter.listTasks();
        if (!isCancelled) {
          setTasks(nextTasks);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
        if (!isCancelled) {
          setTasks([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleToggle = useCallback(
    async (id: string) => {
      await localTaskAdapter.toggleTask(id);
      await loadTasks();
    },
    [loadTasks]
  );

  const handlePress = useCallback((task: Task) => {
    setEditingTask(task);
    setIsFormVisible(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await localTaskAdapter.deleteTask(id);
      await loadTasks();
    },
    [loadTasks]
  );

  const handleSubmit = useCallback(
    async (taskData: CreateTaskInput) => {
      if (editingTask) {
        await localTaskAdapter.updateTask(editingTask.id, taskData as UpdateTaskInput);
      } else {
        await localTaskAdapter.createTask(taskData);
      }

      await loadTasks();
      setIsFormVisible(false);
      setEditingTask(undefined);
    },
    [editingTask, loadTasks]
  );

  const handleCloseForm = useCallback(() => {
    setIsFormVisible(false);
    setEditingTask(undefined);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingTask(undefined);
    setIsFormVisible(true);
  }, []);

  const headerActions = (
    <button
      onClick={openCreateForm}
      className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm"
    >
      New Task
    </button>
  );

  return (
    <AppLayout pageTitle="Tasks" actions={headerActions}>
      <div className="py-8 max-w-4xl mx-auto">
        <PrototypeNotice title="Local task storage">
          Tasks in this view now load from device-local storage. Meeting-created tasks keep their
          source meeting and transcript provenance when present.
        </PrototypeNotice>

        <div className="bg-white rounded-3xl border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <TodoList
            todos={tasks}
            onToggle={handleToggle}
            onPress={handlePress}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <TodoForm
        visible={isFormVisible}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        initialData={editingTask}
        mode={editingTask ? 'edit' : 'create'}
      />
    </AppLayout>
  );
}
