import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@notechain/core-crypto', () => ({
  KeyManager: {
    getMasterKey: vi.fn(async () => new Uint8Array(32).fill(1)),
    deriveDeviceKey: vi.fn(async () => new Uint8Array(32).fill(2)),
  },
  encryptData: vi.fn(async (plaintext: string) => ({
    ciphertext: Buffer.from(plaintext, 'utf8').toString('base64'),
    nonce: 'mock-nonce',
    authTag: 'mock-auth-tag',
  })),
  decryptData: vi.fn(async (encrypted: { ciphertext: string }) =>
    Buffer.from(encrypted.ciphertext, 'base64').toString('utf8')
  ),
}));

import { db } from '../../db';
import { localTaskAdapter } from '../../tasks/taskAdapter';
import { listMeetingFollowUps } from '../meetingFollowUps';

describe('meetingFollowUps', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    await db.close();
  });

  it('lists pending meeting-linked todos only', async () => {
    await localTaskAdapter.createTask({
      title: 'Follow up with Alice',
      priority: 'high',
      status: 'pending',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-1',
      sourceTranscriptSegmentId: 'transcript-segment-1',
      sourceText: 'Alice will send the launch notes',
    });

    await localTaskAdapter.createTask({
      title: 'Completed meeting task',
      priority: 'medium',
      status: 'completed',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-2',
    });

    await localTaskAdapter.createTask({
      title: 'Note-linked task',
      priority: 'medium',
      status: 'pending',
      linkedNoteId: 'note-1',
    });

    const followUps = await listMeetingFollowUps();

    expect(followUps).toHaveLength(1);
    expect(followUps[0]).toMatchObject({
      title: 'Follow up with Alice',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-1',
      sourceTranscriptSegmentId: 'transcript-segment-1',
    });
  });

  it('supports filtering todos by meeting source fields', async () => {
    await localTaskAdapter.createTask({
      title: 'Meeting one task',
      status: 'pending',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-1',
    });

    await localTaskAdapter.createTask({
      title: 'Meeting two task',
      status: 'pending',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-2',
    });

    const todos = await localTaskAdapter.listTasks({
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-2',
    });

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Meeting two task');
  });
});
