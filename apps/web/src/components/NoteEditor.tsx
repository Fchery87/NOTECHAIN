'use client';

import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlock from '@tiptap/extension-code-block';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { VoiceInputButton } from './VoiceInputButton';
import { CollaborativeEditor } from './CollaborativeEditor';

/**
 * Props for the NoteEditor component
 */
export interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  maxHeight?: string;
  /** Note ID for collaboration */
  noteId?: string;
  /** Current user ID */
  userId?: string;
  /** Current user display name */
  displayName?: string;
  /** Collaborators on this note */
  collaborators?: Array<{
    id: string;
    displayName: string;
    avatarUrl?: string;
    permissionLevel: 'view' | 'comment' | 'edit' | 'admin';
  }>;
  /** Callback for share button */
  onShare?: () => void;
}

/**
 * Toolbar button component
 */
function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={`
        p-1.5 rounded-md transition-colors duration-150
        ${
          isActive
            ? 'bg-amber-100 text-amber-900'
            : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
        }
      `}
    >
      {children}
    </button>
  );
}

function Glyph({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`flex h-4 w-4 items-center justify-center text-sm leading-none ${className}`}>
      {children}
    </span>
  );
}

function ToolbarIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Toolbar separator
 */
function ToolbarSeparator() {
  return <div className="w-px h-5 bg-stone-200 mx-1" />;
}

/**
 * NoteEditor component - Rich text editor with Markdown support
 * FR-NOTE-01: Create, edit, delete notes
 * FR-NOTE-02: Rich-text editor with Markdown support
 * Supports collaboration when collaborators are provided
 */
export function NoteEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  minHeight = '300px',
  maxHeight = '600px',
  noteId,
  userId,
  displayName = 'Anonymous',
  collaborators = [],
  onShare,
}: NoteEditorProps) {
  const hasCollaborators = collaborators.length > 0;
  const userPermission = collaborators.find(c => c.id === userId)?.permissionLevel || 'view';

  const collaborationDocumentId = noteId || (userId ? `note-${userId}-local` : undefined);

  // Always call useEditor hook unconditionally (Rules of Hooks)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlock,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-amber-600 underline hover:text-amber-700',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      CharacterCount.configure({
        limit: 100000,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl ?? '');

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:', '');

    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  // Render collaborative editor if there are collaborators
  if (hasCollaborators && userId && collaborationDocumentId) {
    return (
      <CollaborativeEditor
        documentId={collaborationDocumentId}
        userId={userId}
        displayName={displayName}
        permissionLevel={userPermission}
        initialContent={content}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
        maxHeight={maxHeight}
        onShare={onShare}
      />
    );
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8 bg-stone-50 rounded-xl">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      {editable && (
        <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center gap-0.5 rounded-lg bg-white/90 px-2 py-1.5 backdrop-blur-sm">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Glyph className="font-bold">B</Glyph>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Glyph className="font-serif italic text-[17px]">I</Glyph>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <Glyph className="underline underline-offset-2">U</Glyph>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough (Ctrl+Shift+X)"
          >
            <Glyph className="line-through">S</Glyph>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Headings */}
          {([1, 2, 3] as const).map(level => (
            <ToolbarButton
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              isActive={editor.isActive('heading', { level })}
              title={`Heading ${level}`}
            >
              <Glyph className="font-semibold text-[13px]">H{level}</Glyph>
            </ToolbarButton>
          ))}

          <ToolbarSeparator />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <ToolbarIcon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ToolbarIcon d="M10 6h10M10 12h10M10 18h10M4 5l1-1v5M3.5 9h2.5M3.5 14.5a1.5 1.5 0 012.6-1c.6.7 0 1.5-.6 2L3.5 18h3" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Checklist"
          >
            <ToolbarIcon d="M3 5.5l1.5 1.5L7 4.5M3 12.5l1.5 1.5L7 11.5M11 6h10M11 13h10M11 20h10M3.5 18.5h3v3h-3z" />
          </ToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <ToolbarIcon d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code block"
          >
            <ToolbarIcon d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </ToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Add link">
            <ToolbarIcon d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </ToolbarButton>

          <ToolbarButton onClick={addImage} isActive={editor.isActive('image')} title="Add image">
            <ToolbarIcon d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM21 15l-5-5L5 21M8.5 8.5h.01" />
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
            <ToolbarIcon d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            isActive={false}
            title="Redo (Ctrl+Y)"
          >
            <ToolbarIcon d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13" />
          </ToolbarButton>

          {/* Share button */}
          {onShare && (
            <div className="ml-auto flex items-center gap-3">
              {/* Collaborators indicator */}
              {collaborators.length > 0 && (
                <div className="flex items-center -space-x-2">
                  {collaborators.slice(0, 3).map(collaborator => (
                    <div
                      key={collaborator.id}
                      className="w-7 h-7 rounded-full bg-stone-200 border-2 border-white flex items-center justify-center text-xs font-medium text-stone-600"
                      title={`${collaborator.displayName} (${collaborator.permissionLevel})`}
                    >
                      {collaborator.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
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
                    <div className="w-7 h-7 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-xs font-medium text-stone-500">
                      +{collaborators.length - 3}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={onShare}
                className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-stone-50 text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="relative" style={{ minHeight, maxHeight }}>
        <EditorContent
          editor={editor}
          className="overflow-y-auto py-4 [&_.ProseMirror]:min-h-[inherit]"
          style={{ minHeight, maxHeight }}
        />
      </div>

      {/* Character count */}
      <div className="flex items-center gap-3 border-t border-stone-100 pt-3 text-xs text-stone-400 tabular-nums">
        <span>{editor.storage.characterCount?.words?.() ?? 0} words</span>
        <span>{editor.storage.characterCount?.characters?.() ?? 0} characters</span>
      </div>
    </div>
  );
}

export default NoteEditor;
