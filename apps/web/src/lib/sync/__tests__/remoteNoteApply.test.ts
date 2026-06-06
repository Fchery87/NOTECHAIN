import { describe, expect, it } from 'vitest';
import {
  applyRemoteNoteDelete,
  applyRemoteNoteUpsert,
  removeIdFromSet,
  type VersionedNoteLike,
} from '../remoteNoteApply';

interface TestNote extends VersionedNoteLike {
  title: string;
  content: string;
}

describe('remoteNoteApply', () => {
  it('prepends remote-created notes', () => {
    const notes: TestNote[] = [{ id: 'note-1', title: 'One', content: 'Local', version: 1 }];

    const result = applyRemoteNoteUpsert(
      notes,
      { id: 'note-2', title: 'Two', content: 'Remote', version: 1 },
      1
    );

    expect(result.map(note => note.id)).toEqual(['note-2', 'note-1']);
    expect(result[0]).toMatchObject({ title: 'Two', content: 'Remote', version: 1 });
  });

  it('applies newer remote updates', () => {
    const notes: TestNote[] = [{ id: 'note-1', title: 'Old', content: 'Local', version: 1 }];

    const result = applyRemoteNoteUpsert(
      notes,
      { id: 'note-1', title: 'New', content: 'Remote', version: 2 },
      2
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: 'New', content: 'Remote', version: 2 });
  });

  it('ignores stale remote updates', () => {
    const notes: TestNote[] = [{ id: 'note-1', title: 'Current', content: 'Local', version: 5 }];

    const result = applyRemoteNoteUpsert(
      notes,
      { id: 'note-1', title: 'Stale', content: 'Remote', version: 4 },
      4
    );

    expect(result).toBe(notes);
    expect(result[0]).toMatchObject({ title: 'Current', content: 'Local', version: 5 });
  });

  it('allows equal-version replays to refresh local state', () => {
    const notes: TestNote[] = [{ id: 'note-1', title: 'Old replay', content: 'Local', version: 3 }];

    const result = applyRemoteNoteUpsert(
      notes,
      { id: 'note-1', title: 'Replay', content: 'Remote', version: 3 },
      3
    );

    expect(result).not.toBe(notes);
    expect(result[0]).toMatchObject({ title: 'Replay', content: 'Remote', version: 3 });
  });

  it('applies remote delete tombstones', () => {
    const notes: TestNote[] = [
      { id: 'note-1', title: 'One', content: 'A', version: 1 },
      { id: 'note-2', title: 'Two', content: 'B', version: 1 },
    ];

    const result = applyRemoteNoteDelete(notes, 'note-1');

    expect(result.map(note => note.id)).toEqual(['note-2']);
  });

  it('removes ids from sets immutably', () => {
    const ids = new Set(['note-1', 'note-2']);
    const result = removeIdFromSet(ids, 'note-1');

    expect(Array.from(ids)).toEqual(['note-1', 'note-2']);
    expect(Array.from(result)).toEqual(['note-2']);
  });
});
