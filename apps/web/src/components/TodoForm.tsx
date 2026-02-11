'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Todo } from '@notechain/data-models';

/**
 * Props for the TodoForm component
 */
export interface TodoFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (todo: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    estimatedMinutes?: number;
  }) => void;
  initialData?: Partial<Todo>;
  mode?: 'create' | 'edit';
}

/**
 * Priority options with labels
 */
const priorityOptions: Array<{
  value: Todo['priority'];
  label: string;
  description: string;
}> = [
  { value: 'low', label: 'Low', description: 'Can wait' },
  { value: 'medium', label: 'Medium', description: 'Normal priority' },
  { value: 'high', label: 'High', description: 'Important' },
  { value: 'critical', label: 'Critical', description: 'Urgent' },
];

/**
 * TodoForm component - Form for creating and editing todos
 * FR-TODO-01: Create, edit, delete tasks
 */
export function TodoForm({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: TodoFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dueDate, setDueDate] = useState<string>(
    initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : ''
  );
  const [dueTime, setDueTime] = useState<string>(
    initialData?.dueDate ? new Date(initialData.dueDate).toTimeString().slice(0, 5) : ''
  );
  const [priority, setPriority] = useState<Todo['priority']>(initialData?.priority ?? 'medium');
  const [tags, setTags] = useState<string>(initialData?.tags?.join(', ') ?? '');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    initialData?.estimatedMinutes?.toString() ?? ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when visibility changes
  useEffect(() => {
    if (visible) {
      setTitle(initialData?.title ?? '');
      setDescription(initialData?.description ?? '');
      setDueDate(
        initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : ''
      );
      setDueTime(
        initialData?.dueDate ? new Date(initialData.dueDate).toTimeString().slice(0, 5) : ''
      );
      setPriority(initialData?.priority ?? 'medium');
      setTags(initialData?.tags?.join(', ') ?? '');
      setEstimatedMinutes(initialData?.estimatedMinutes?.toString() ?? '');
      setErrors({});
    }
  }, [visible, initialData]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        newErrors.dueDate = 'Invalid date';
      }
    }

    if (estimatedMinutes) {
      const minutes = parseInt(estimatedMinutes, 10);
      if (isNaN(minutes) || minutes < 1 || minutes > 10080) {
        newErrors.estimatedMinutes = 'Must be between 1 and 10080 minutes (1 week)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, dueDate, estimatedMinutes]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      // Parse due date with time if provided
      let parsedDueDate: Date | undefined;
      if (dueDate) {
        parsedDueDate = new Date(dueDate);
        if (dueTime) {
          const [hours, minutes] = dueTime.split(':').map(Number);
          parsedDueDate.setHours(hours, minutes, 0, 0);
        }
      }

      // Parse tags
      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: parsedDueDate,
        priority,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined,
      });

      // Reset form
      resetForm();
      onClose();
    },
    [
      title,
      description,
      dueDate,
      dueTime,
      priority,
      tags,
      estimatedMinutes,
      validate,
      onSubmit,
      onClose,
    ]
  );

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setDueTime('');
    setPriority('medium');
    setTags('');
    setEstimatedMinutes('');
    setErrors({});
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="todo-form-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 id="todo-form-title" className="text-lg font-serif font-medium text-stone-900">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="todo-title" className="block text-sm font-medium text-stone-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="todo-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className={`
                w-full px-4 py-3 bg-white border rounded-lg
                text-stone-900 placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                transition-all duration-200
                ${errors.title ? 'border-red-300' : 'border-stone-200'}
              `}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="todo-description"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="todo-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className={`
                w-full px-4 py-3 bg-white border rounded-lg
                text-stone-900 placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                transition-all duration-200 resize-none
                ${errors.description ? 'border-red-300' : 'border-stone-200'}
              `}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="todo-due-date"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                Due Date
              </label>
              <input
                id="todo-due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-lg
                  text-stone-900
                  focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                  transition-all duration-200
                  ${errors.dueDate ? 'border-red-300' : 'border-stone-200'}
                `}
              />
              {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>}
            </div>
            <div>
              <label
                htmlFor="todo-due-time"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                Time
              </label>
              <input
                id="todo-due-time"
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Priority</label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`
                    px-4 py-2 rounded-lg border text-sm font-medium
                    transition-all duration-200
                    ${
                      priority === option.value
                        ? 'bg-stone-900 text-stone-50 border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="todo-tags" className="block text-sm font-medium text-stone-700 mb-1.5">
              Tags
            </label>
            <input
              id="todo-tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="work, urgent, project-x (comma separated)"
              className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
            />
            <p className="mt-1 text-xs text-stone-500">Separate tags with commas</p>
          </div>

          {/* Estimated Time */}
          <div>
            <label
              htmlFor="todo-estimated"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              Estimated Time (minutes)
            </label>
            <input
              id="todo-estimated"
              type="number"
              min="1"
              max="10080"
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(e.target.value)}
              placeholder="30"
              className={`
                w-full px-4 py-2.5 bg-white border rounded-lg
                text-stone-900 placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                transition-all duration-200
                ${errors.estimatedMinutes ? 'border-red-300' : 'border-stone-200'}
              `}
            />
            {errors.estimatedMinutes && (
              <p className="mt-1 text-sm text-red-600">{errors.estimatedMinutes}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-stone-600 font-medium rounded-lg hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/20"
            >
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TodoForm;
