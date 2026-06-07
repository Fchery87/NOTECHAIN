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

import { db, createNote } from '../../db';
import { buildMeetingPrepQuery, getMeetingPrepContext } from '../meetingPrepContext';

describe('meetingPrepContext', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    await db.close();
  });

  it('builds a focused prep query from a meeting title', () => {
    expect(buildMeetingPrepQuery('Product Review Meeting')).toBe('product review');
  });

  it('returns manual prep context with related local notes', async () => {
    await createNote({
      title: 'Product Review Notes',
      content: 'Roadmap, launch risks, and follow-up questions.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const context = await getMeetingPrepContext({
      meetingTitle: 'Product Review Meeting',
    });

    expect(context.source).toBe('manual');
    expect(context.query).toBe('product review');
    expect(context.relatedNotes[0]).toMatchObject({
      type: 'note',
      title: 'Product Review Notes',
    });
  });

  it('marks prep context as calendar-event when a calendar event shell is linked', async () => {
    const context = await getMeetingPrepContext({
      meetingTitle: 'Team Standup',
      calendarEventId: 'evt-123',
    });

    expect(context.source).toBe('calendar-event');
    expect(context.calendarEventId).toBe('evt-123');
  });
});
