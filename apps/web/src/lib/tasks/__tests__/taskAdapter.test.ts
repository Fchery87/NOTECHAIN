import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { localTaskAdapter } from '../taskAdapter';

describe('localTaskAdapter', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    await db.close();
  });

  it('creates and lists locally stored tasks with task-facing fields', async () => {
    const createdTask = await localTaskAdapter.createTask({
      title: 'Prepare launch checklist',
      description: 'Capture all follow-up items',
      priority: 'critical',
      status: 'in_progress',
      tags: ['launch', 'ops'],
      estimatedMinutes: 45,
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-42',
      sourceTranscriptSegmentId: 'segment-7',
      sourceText: 'We need a launch checklist by Friday.',
    });

    const tasks = await localTaskAdapter.listTasks({ sourceType: 'meeting' });

    expect(tasks).toHaveLength(1);
    expect(createdTask).toMatchObject({
      title: 'Prepare launch checklist',
      priority: 'critical',
      status: 'in_progress',
      tags: ['launch', 'ops'],
      estimatedMinutes: 45,
      sourceMeetingId: 'meeting-42',
      sourceTranscriptSegmentId: 'segment-7',
    });
    expect(tasks[0]).toMatchObject({
      id: createdTask.id,
      sourceType: 'meeting',
      sourceText: 'We need a launch checklist by Friday.',
    });
  });

  it('preserves meeting provenance when updating task status', async () => {
    const task = await localTaskAdapter.createTask({
      title: 'Send recap',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-99',
      sourceTranscriptSegmentId: 'segment-3',
      sourceText: 'Alice will send the recap email.',
    });

    const updatedTask = await localTaskAdapter.updateTask(task.id, {
      status: 'completed',
      completedAt: new Date('2026-06-26T12:00:00.000Z'),
    });

    expect(updatedTask).toMatchObject({
      id: task.id,
      status: 'completed',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-99',
      sourceTranscriptSegmentId: 'segment-3',
      sourceText: 'Alice will send the recap email.',
    });
  });
});
