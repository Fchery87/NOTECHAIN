import React from 'react';

/**
 * Collaborator data for a note
 */
export interface NoteCollaborator {
  id: string;
  displayName: string;
  avatarUrl?: string;
  permissionLevel: 'view' | 'comment' | 'edit' | 'admin';
}

/**
 * Permission level labels and colors
 */
const permissionConfig = {
  view: { label: 'View', color: 'bg-stone-100 text-stone-600' },
  comment: { label: 'Comment', color: 'bg-blue-100 text-blue-700' },
  edit: { label: 'Edit', color: 'bg-amber-100 text-amber-700' },
  admin: { label: 'Admin', color: 'bg-rose-100 text-rose-700' },
} as const;

/**
 * Props for the NoteCard component
 */
export interface NoteCardProps {
  /** Note ID */
  id: string;
  /** Note title */
  title: string;
  /** Note content preview */
  content?: string;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Note owner ID */
  ownerId?: string;
  /** Owner display name */
  ownerName?: string;
  /** Collaborators on this note */
  collaborators?: NoteCollaborator[];
  /** User ID of the current user */
  currentUserId?: string;
  /** Click handler — selects the note */
  onClick?: (id: string) => void;
  /** Whether this note is currently selected */
  isSelected?: boolean;
  /** Edit handler — opens inline rename or navigates to editor */
  onEdit?: (id: string) => void;
  /** Delete handler */
  onDelete?: (id: string) => void;
  /** Whether multi-select mode is active */
  isSelectable?: boolean;
  /** Whether this card is checked in multi-select */
  isChecked?: boolean;
  /** Toggle multi-select check for this note */
  onToggleSelect?: (id: string) => void;
}

/**
 * Formats a date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }
}

/**
 * Strips HTML tags from content for preview
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').slice(0, 120);
}

/**
 * Inline SVG icons — small, no dependency needed
 */
const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

/**
 * NoteCard component - Preview card for a note with collaboration indicators
 */
export function NoteCard({
  id,
  title,
  content = '',
  updatedAt,
  ownerName,
  collaborators = [],
  currentUserId,
  onClick,
  isSelected = false,
  onEdit,
  onDelete,
  isSelectable = false,
  isChecked = false,
  onToggleSelect,
}: NoteCardProps) {
  const isShared = collaborators.length > 0;
  const currentUser = collaborators.find(c => c.id === currentUserId);
  const userPermission = currentUser?.permissionLevel;
  const hasActions = !!onEdit || !!onDelete;

  return (
    <div
      className={`group relative w-full text-left border-b border-stone-100 last:border-b-0 transition-all duration-200 ${
        isSelected ? 'bg-amber-50 border-amber-200' : 'hover:bg-stone-50'
      }`}
    >
      {/* Multi-select checkbox */}
      {isSelectable && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={e => {
              e.stopPropagation();
              onToggleSelect?.(id);
            }}
            className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
          />
        </div>
      )}

      <button
        onClick={() => onClick?.(id)}
        className={`w-full text-left p-4 transition-all duration-200 ${isSelectable ? 'pl-9' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Shared icon */}
              {isShared && (
                <svg
                  className="w-4 h-4 text-stone-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              )}
              <h3 className="font-medium text-stone-900 truncate">{title || 'Untitled Note'}</h3>
            </div>

            {/* Content preview */}
            {content && (
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">{stripHtml(content)}</p>
            )}

            {/* Metadata row */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-stone-400">{formatDate(updatedAt)}</span>

              {/* Last edited by */}
              {ownerName && <span className="text-xs text-stone-400">by {ownerName}</span>}

              {/* Permission badge for current user */}
              {userPermission && userPermission !== 'view' && (
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    permissionConfig[userPermission]?.color || permissionConfig.view.color
                  }`}
                >
                  {permissionConfig[userPermission]?.label || 'View'}
                </span>
              )}
            </div>
          </div>

          {/* Collaborator avatars */}
          {isShared && (
            <div className="flex items-center -space-x-1.5 flex-shrink-0">
              {collaborators.slice(0, 3).map(collaborator => (
                <div
                  key={collaborator.id}
                  className="w-6 h-6 rounded-full bg-stone-200 border border-white flex items-center justify-center text-xs font-medium text-stone-600"
                  title={`${collaborator.displayName} (${collaborator.permissionLevel})`}
                >
                  {collaborator.avatarUrl ? (
                    <img
                      src={collaborator.avatarUrl}
                      alt={collaborator.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    collaborator.displayName.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-stone-100 border border-white flex items-center justify-center text-xs font-medium text-stone-500">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Hover action buttons */}
      {hasActions && !isSelectable && (
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {onEdit && (
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(id);
              }}
              title="Edit note"
              className="p-1.5 rounded-md bg-white border border-stone-200 text-stone-400 hover:text-amber-600 hover:border-amber-300 shadow-sm transition-colors"
            >
              <EditIcon />
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(id);
              }}
              title="Delete note"
              className="p-1.5 rounded-md bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default NoteCard;
