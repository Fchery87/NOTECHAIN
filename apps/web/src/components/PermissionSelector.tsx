'use client';

import React from 'react';

/**
 * Permission levels available for sharing
 */
export type PermissionLevel = 'view' | 'comment' | 'edit' | 'admin';

/**
 * Props for PermissionSelector component
 */
export interface PermissionSelectorProps {
  /** Currently selected permission level */
  value: PermissionLevel;
  /** Callback when permission changes */
  onChange: (level: PermissionLevel) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show descriptions */
  showDescriptions?: boolean;
}

/**
 * Permission option configuration
 */
const PERMISSION_OPTIONS: Array<{
  value: PermissionLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'view',
    label: 'View',
    description: 'Can view only',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
  {
    value: 'comment',
    label: 'Comment',
    description: 'Can view and add comments',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
      </svg>
    ),
  },
  {
    value: 'edit',
    label: 'Edit',
    description: 'Can view, comment, and edit',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full control including sharing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
];

/**
 * PermissionSelector component
 * Dropdown for selecting permission levels
 */
export function PermissionSelector({
  value,
  onChange,
  disabled = false,
  size = 'md',
  showDescriptions = false,
}: PermissionSelectorProps) {
  const _selectedOption = PERMISSION_OPTIONS.find(opt => opt.value === value);

  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2 px-4',
  };

  if (showDescriptions) {
    return (
      <div className="space-y-2">
        {PERMISSION_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`
              w-full flex items-start gap-3 p-3 rounded-lg border transition-all
              ${
                value === option.value
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className={value === option.value ? 'text-amber-600' : 'text-stone-500'}>
              {option.icon}
            </span>
            <div className="text-left">
              <div
                className={`font-medium ${value === option.value ? 'text-amber-900' : 'text-stone-900'}`}
              >
                {option.label}
              </div>
              <div className="text-sm text-stone-500">{option.description}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value as PermissionLevel)}
        disabled={disabled}
        className={`
          appearance-none bg-white border border-stone-200 rounded-lg
          ${sizeClasses[size]}
          pr-10 text-stone-700 font-medium
          focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
        `}
      >
        {PERMISSION_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Permission badge for display
 */
export function PermissionBadge({ level }: { level: PermissionLevel }) {
  const colors: Record<PermissionLevel, string> = {
    view: 'bg-stone-100 text-stone-700',
    comment: 'bg-blue-100 text-blue-700',
    edit: 'bg-amber-100 text-amber-700',
    admin: 'bg-rose-100 text-rose-700',
  };

  const labels: Record<PermissionLevel, string> = {
    view: 'View',
    comment: 'Comment',
    edit: 'Edit',
    admin: 'Admin',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[level]}`}
    >
      {labels[level]}
    </span>
  );
}

export default PermissionSelector;
