'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlock from '@tiptap/extension-code-block';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import { CollaborationPresence } from './CollaborationPresence';
import { CollaborationCursors } from './CollaborationCursors';
import { useCollaboration, CRDTOperationType, type CRDTOperation } from '../hooks/useCollaboration';
import { VoiceInputButton } from './VoiceInputButton';

/**
 * Props for CollaborativeEditor component
 */
export interface CollaborativeEditorProps {
  /** Document ID */
  documentId: string;
  /** Current user ID */
  userId: string;
  /** Current user display name */
  displayName?: string;
  /** Current user avatar URL */
  avatarUrl?: string;
  /** User's permission level */
  permissionLevel: 'view' | 'comment' | 'edit' | 'admin';
  /** Initial content */
  initialContent?: string;
  /** Content change callback */
  onChange?: (content: string) => void;
  /** WebSocket server URL */
  wsUrl?: string;
  /** JWT token for authentication */
  token?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height */
  minHeight?: string;
  /** Maximum height */
  maxHeight?: string;
  /** Show share button */
  onShare?: () => void;
}

/**
 * Sync status indicator
 */
function SyncStatus({ isSyncing }: { isSyncing: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-stone-100">
      {isSyncing ? (
        <>
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-medium text-stone-600">Syncing...</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-stone-600">Saved</span>
        </>
      )}
    </div>
  );
}

/**
 * Permission badge
 */
function PermissionBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    view: 'bg-stone-100 text-stone-600',
    comment: 'bg-blue-100 text-blue-700',
    edit: 'bg-amber-100 text-amber-700',
    admin: 'bg-rose-100 text-rose-700',
  };

  const labels: Record<string, string> = {
    view: 'View only',
    comment: 'Can comment',
    edit: 'Can edit',
    admin: 'Admin',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] || colors.view}`}>
      {labels[level] || level}
    </span>
  );
}

/**
 * Toolbar button component
 */
function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
  disabled = false,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${
          disabled
            ? 'text-stone-300 cursor-not-allowed'
            : isActive
              ? 'bg-stone-200 text-stone-900'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
        }
      `}
    >
      {children}
    </button>
  );
}

/**
 * Toolbar separator
 */
function ToolbarSeparator() {
  return <div className="w-px h-6 bg-stone-200 mx-1" />;
}

/**
 * CollaborativeEditor component
 * Rich text editor with real-time collaboration features
 */
export function CollaborativeEditor({
  documentId,
  userId,
  displayName = 'Anonymous',
  avatarUrl,
  permissionLevel,
  initialContent = '',
  onChange,
  wsUrl,
  token,
  placeholder = 'Start writing...',
  minHeight = '300px',
  maxHeight = '600px',
  onShare,
}: CollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRemoteUpdateRef = useRef(false);

  // Initialize collaboration hook
  const collaboration = useCollaboration({
    documentId,
    userId,
    displayName,
    avatarUrl,
    permissionLevel,
    wsUrl,
    token,
    debug: false,
  });

  // Initialize editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Placeholder.configure({ placeholder }),
      CodeBlock,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-amber-600 underline hover:text-amber-700' },
      }),
      Image.configure({ inline: true, allowBase64: true }),
      CharacterCount.configure({ limit: 100000 }),
    ],
    content: initialContent,
    editable: permissionLevel === 'edit' || permissionLevel === 'admin',
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (isRemoteUpdateRef.current) {
        return;
      }

      const content = editor.getHTML();
      onChange?.(content);

      // Show syncing status
      setIsSyncing(true);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        setIsSyncing(false);
      }, 1000);

      // Create and send operation
      // Note: In production, you'd want to track actual changes
      // This is a simplified version
      const operation: CRDTOperation = {
        type: CRDTOperationType.INSERT,
        position: 0,
        content,
        userId,
        timestamp: Date.now(),
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      collaboration.sendOperation(operation);
    },
  });

  // Handle remote operations
  useEffect(() => {
    const unsubscribe = collaboration.onRemoteOperation(operation => {
      if (!editor || operation.userId === userId) {
        return;
      }

      isRemoteUpdateRef.current = true;

      // Apply operation to editor
      // Note: This is simplified - in production you'd apply the actual CRDT operation
      if (operation.content) {
        // For now, we just mark that we received a remote operation
        // The actual content sync would be handled by the CRDT system
      }

      isRemoteUpdateRef.current = false;
    });

    return unsubscribe;
  }, [editor, collaboration, userId]);

  // Update cursor position
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      collaboration.updateCursor({
        userId,
        position: from,
        selection: from !== to ? { from, to } : undefined,
        timestamp: Date.now(),
      });
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, collaboration, userId]);

  // Set initial content
  useEffect(() => {
    if (editor && initialContent && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      collaboration.leaveDocument();
    };
  }, [collaboration]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl ?? '');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Enter image URL:', '');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const canEdit = permissionLevel === 'edit' || permissionLevel === 'admin';

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8 bg-stone-50 rounded-xl">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header with presence and status */}
      <div className="flex items-center justify-between">
        <CollaborationPresence
          users={collaboration.connectedUsers}
          localUser={collaboration.localPresence}
          isConnected={collaboration.isConnected}
          showStatus
        />

        <div className="flex items-center gap-3">
          <PermissionBadge level={permissionLevel} />
          <SyncStatus isSyncing={isSyncing} />
          {onShare && (
            <button
              onClick={onShare}
              className="px-3 py-1.5 bg-stone-900 text-stone-50 text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
            >
              Share
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {canEdit && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-white border border-stone-200 rounded-xl shadow-sm">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 4h8a4 4 0 014 4v10a4 4 0 01-4 4H6a4 4 0 01-4-4V8a4 4 0 014-4z"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 4h4a2 2 0 012 2v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V6a2 2 0 012-2z"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v7a5 5 0 0010 0v4M5 20h14"
              />
            </svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <span className="font-bold text-sm">H1</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <span className="font-bold text-sm">H2</span>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h10M7 16h10M3 8h.01M3 12h.01M3 16h.01"
              />
            </svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Link and Image */}
          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive('link')}
            title="Add Link (Ctrl+K)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton onClick={addImage} isActive={editor.isActive('image')} title="Add Image">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M16 16h.01"
              />
            </svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Voice Input */}
          <VoiceInputButton editor={editor} />

          <ToolbarSeparator />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            isActive={false}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            isActive={false}
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
              />
            </svg>
          </ToolbarButton>
        </div>
      )}

      {/* Editor with cursors */}
      <div
        ref={editorRef}
        className="relative bg-white border border-stone-200 rounded-xl overflow-hidden"
        style={{ minHeight, maxHeight }}
      >
        {/* Remote cursors */}
        <CollaborationCursors
          users={collaboration.connectedUsers}
          editorRef={editorRef}
          showLabels
        />

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className="prose prose-stone max-w-none p-6 overflow-y-auto"
          style={{ minHeight, maxHeight }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-stone-400 px-2">
        <span>{editor.storage.characterCount?.characters?.() ?? 0} characters</span>
        <span>{editor.storage.characterCount?.words?.() ?? 0} words</span>
      </div>

      {/* Connection error */}
      {collaboration.error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
          Connection error: {collaboration.error.message}
        </div>
      )}
    </div>
  );
}

export default CollaborativeEditor;
