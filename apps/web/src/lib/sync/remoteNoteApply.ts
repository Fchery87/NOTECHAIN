export interface VersionedNoteLike {
  id: string;
  version?: number;
}

/**
 * Apply a remote create/update to a local note list.
 *
 * Conflict policy for the current trust-first implementation:
 * - higher version wins;
 * - equal version replays are allowed to refresh local state;
 * - lower version remote operations are ignored as stale;
 * - new remote notes are prepended.
 *
 * This is intentionally simple and deterministic. It is not a collaborative
 * text-merge strategy; richer concurrent editing should use a documented merge
 * policy or CRDT layer.
 */
export function applyRemoteNoteUpsert<TNote extends VersionedNoteLike>(
  notes: TNote[],
  remoteNote: TNote,
  incomingVersion: number
): TNote[] {
  const existing = notes.find(note => note.id === remoteNote.id);

  if (existing && (existing.version ?? 0) > incomingVersion) {
    return notes;
  }

  const normalizedRemoteNote = {
    ...remoteNote,
    version: incomingVersion,
  };

  if (existing) {
    return notes.map(note =>
      note.id === remoteNote.id ? ({ ...note, ...normalizedRemoteNote } as TNote) : note
    );
  }

  return [normalizedRemoteNote as TNote, ...notes];
}

/**
 * Apply a remote delete/tombstone to a local note list.
 */
export function applyRemoteNoteDelete<TNote extends VersionedNoteLike>(
  notes: TNote[],
  noteId: string
): TNote[] {
  return notes.filter(note => note.id !== noteId);
}

export function removeIdFromSet<TId>(set: Set<TId>, id: TId): Set<TId> {
  const next = new Set(set);
  next.delete(id);
  return next;
}
