'use client';

import React, { useState, useCallback } from 'react';
import type { Todo } from '@notechain/data-models';

/**
 * Props for the TodoList component
 */
export interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onPress: (todo: Todo) => void;
  onDelete?: (id: string) => void;
  onEdit?: (todo: Todo) => void;
  isLoading?: boolean;
}

/**
 * Priority color mapping
 */
const priorityColors: Record<Todo['priority'], string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Priority badge component
 */
function PriorityBadge({ priority }: { priority: Todo['priority'] }) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityColors[priority]}`}
    >
      {priority}
    </span>
  );
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: Todo['status'] }) {
  const statusStyles: Record<Todo['status'], string> = {
    pending: 'bg-stone-200',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    cancelled: 'bg-stone-400',
  };

  const statusLabels: Record<Todo['status'], string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${statusStyles[status]}`} />
      <span className="text-xs text-stone-500">{statusLabels[status]}</span>
    </div>
  );
}

/**
 * Checkbox component for todo completion
 */
function TodoCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onChange();
      }}
      className={`
        w-5 h-5 rounded-md border-2 flex items-center justify-center
        transition-all duration-200
        ${checked ? 'bg-stone-900 border-stone-900' : 'border-stone-300 hover:border-stone-400'}
      `}
      aria-label={checked ? 'Mark as incomplete' : 'Mark as complete'}
    >
      {checked && (
        <svg
          className="w-3 h-3 text-stone-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

/**
 * Format date for display
 */
function formatDueDate(date: Date): string {
  const now = new Date();
  const dueDate = new Date(date);
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else {
    return dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: dueDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Check if a date is overdue
 */
function isOverdue(date: Date): boolean {
  return new Date(date) < new Date();
}

/**
 * TodoList component - Displays a list of todos with actions
 * FR-TODO-01: Create, edit, delete tasks
 * FR-TODO-02: Mark tasks as complete/incomplete
 * FR-TODO-03: Overdue task highlighting
 */
export function TodoList({
  todos,
  onToggle,
  onPress,
  onDelete,
  onEdit,
  isLoading = false,
}: TodoListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, todo: Todo) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPress(todo);
      } else if (e.key === 'Delete' && onDelete) {
        e.preventDefault();
        onDelete(todo.id);
      }
    },
    [onPress, onDelete]
  );

  if (isLoading) {
    return (
      <div className="space-y-3" role="list" aria-label="Loading todos">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-stone-100 rounded-xl h-20" />
        ))}
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-stone-900">No tasks yet</h3>
        <p className="text-stone-500 mt-1">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" role="list" aria-label="Todo list">
      {todos.map(todo => {
        const isCompleted = todo.status === 'completed';
        const overdue = todo.dueDate && isOverdue(todo.dueDate) && !isCompleted;

        return (
          <div
            key={todo.id}
            role="listitem"
            tabIndex={0}
            onClick={() => onPress(todo)}
            onKeyDown={e => handleKeyDown(e, todo)}
            onMouseEnter={() => setHoveredId(todo.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
              group relative flex items-start gap-3 p-4 rounded-xl
              bg-white border border-stone-200
              hover:border-stone-300 hover:shadow-sm
              transition-all duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
              ${isCompleted ? 'opacity-60' : ''}
              ${overdue ? 'border-red-200 bg-red-50/30' : ''}
            `}
          >
            {/* Checkbox */}
            <div className="flex-shrink-0 pt-0.5">
              <TodoCheckbox checked={isCompleted} onChange={() => onToggle(todo.id)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`
                    text-sm font-medium text-stone-900
                    ${isCompleted ? 'line-through text-stone-500' : ''}
                  `}
                >
                  {todo.title}
                </h3>
                <PriorityBadge priority={todo.priority} />
              </div>

              {todo.description && (
                <p className="mt-1 text-sm text-stone-500 line-clamp-2">{todo.description}</p>
              )}

              <div className="mt-2 flex items-center gap-3">
                <StatusIndicator status={todo.status} />

                {todo.dueDate && (
                  <span
                    className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-stone-500'}`}
                  >
                    {formatDueDate(todo.dueDate)}
                  </span>
                )}

                {todo.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {todo.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs bg-stone-100 text-stone-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {todo.tags.length > 3 && (
                      <span className="text-xs text-stone-400">+{todo.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons (visible on hover) */}
            <div
              className={`
                flex items-center gap-1 transition-opacity duration-200
                ${hoveredId === todo.id ? 'opacity-100' : 'opacity-0'}
              `}
            >
              {onEdit && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(todo);
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                  aria-label="Edit task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(todo.id);
                  }}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Delete task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TodoList;
