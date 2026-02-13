'use client';

import React, { useEffect, useRef } from 'react';
import type { UserPresence, CursorPosition } from '../hooks/useCollaboration';

/**
 * Props for CollaborationCursors component
 */
export interface CollaborationCursorsProps {
  /** Users with cursor positions to display */
  users: UserPresence[];
  /** Editor container ref for position calculation */
  editorRef: React.RefObject<HTMLElement | null>;
  /** Whether to show cursor labels */
  showLabels?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * Single cursor overlay component
 */
function CursorOverlay({
  user,
  position,
  showLabel = true,
  animationDuration = 100,
}: {
  user: UserPresence;
  position: { top: number; left: number };
  showLabel?: boolean;
  animationDuration?: number;
}) {
  if (!user.cursor || user.status === 'offline') {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none transition-all ease-out"
      style={{
        top: position.top,
        left: position.left,
        transitionDuration: `${animationDuration}ms`,
        zIndex: 50,
      }}
    >
      {/* Cursor line */}
      <div className="w-0.5 h-5 rounded-full" style={{ backgroundColor: user.color }} />

      {/* Label */}
      {showLabel && (
        <div
          className="absolute top-5 left-0 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: user.color }}
        >
          {user.displayName}
        </div>
      )}

      {/* Selection highlight */}
      {user.cursor.selection && (
        <div
          className="absolute top-0 left-0 opacity-20 rounded"
          style={{
            backgroundColor: user.color,
            width: '100%',
            height: '1.25rem',
          }}
        />
      )}
    </div>
  );
}

/**
 * Calculate cursor position from character index
 */
function calculateCursorPosition(
  editorElement: HTMLElement | null,
  characterIndex: number
): { top: number; left: number } {
  if (!editorElement) {
    return { top: 0, left: 0 };
  }

  // Try to find the text node at the character position
  const walker = document.createTreeWalker(editorElement, NodeFilter.SHOW_TEXT, null);

  let currentLength = 0;
  let node: Text | null;

  while ((node = walker.nextNode() as Text)) {
    const nodeLength = node.textContent?.length || 0;
    if (currentLength + nodeLength >= characterIndex) {
      // Found the node containing our position
      const range = document.createRange();
      const offset = characterIndex - currentLength;
      try {
        range.setStart(node, Math.min(offset, nodeLength));
        range.setEnd(node, Math.min(offset, nodeLength));
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const editorRect = editorElement.getBoundingClientRect();
          return {
            top: rects[0].top - editorRect.top,
            left: rects[0].left - editorRect.left,
          };
        }
      } catch {
        // Range creation failed, fall back to default
      }
      break;
    }
    currentLength += nodeLength;
  }

  return { top: 0, left: 0 };
}

/**
 * CollaborationCursors component
 * Renders remote user cursors on top of the editor
 */
export function CollaborationCursors({
  users,
  editorRef,
  showLabels = true,
  animationDuration = 100,
}: CollaborationCursorsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Map<string, { top: number; left: number }>>(new Map());

  // Update cursor positions when users change
  useEffect(() => {
    const editorElement = editorRef.current;
    if (!editorElement) return;

    users.forEach(user => {
      if (user.cursor && user.status !== 'offline') {
        const position = calculateCursorPosition(editorElement, user.cursor.position);
        positionsRef.current.set(user.userId, position);
      }
    });
  }, [users, editorRef]);

  // Filter users with cursors
  const usersWithCursors = users.filter(user => user.cursor && user.status !== 'offline');

  if (usersWithCursors.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 40 }}
    >
      {usersWithCursors.map(user => {
        const position = positionsRef.current.get(user.userId) || { top: 0, left: 0 };
        return (
          <CursorOverlay
            key={user.userId}
            user={user}
            position={position}
            showLabel={showLabels}
            animationDuration={animationDuration}
          />
        );
      })}
    </div>
  );
}

/**
 * Selection highlight component for showing remote selections
 */
export function SelectionHighlight({
  user,
  editorRef,
}: {
  user: UserPresence;
  editorRef: React.RefObject<HTMLElement | null>;
}) {
  if (!user.cursor?.selection || user.status === 'offline') {
    return null;
  }

  const { from, to } = user.cursor.selection;
  const editorElement = editorRef.current;

  if (!editorElement || from === to) {
    return null;
  }

  // Calculate selection rectangles
  const selectionRects: Array<{ top: number; left: number; width: number; height: number }> = [];

  // This is a simplified version - in production, you'd want to calculate
  // actual selection rectangles using Range API
  const startPos = calculateCursorPosition(editorElement, from);
  const endPos = calculateCursorPosition(editorElement, to);

  if (startPos.top === endPos.top) {
    // Single line selection
    selectionRects.push({
      top: startPos.top,
      left: startPos.left,
      width: endPos.left - startPos.left,
      height: 20, // Approximate line height
    });
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
      {selectionRects.map((rect, index) => (
        <div
          key={index}
          className="absolute rounded opacity-20"
          style={{
            top: rect.top,
            left: rect.left,
            width: Math.max(rect.width, 2),
            height: rect.height,
            backgroundColor: user.color,
          }}
        />
      ))}
    </div>
  );
}

export default CollaborationCursors;
