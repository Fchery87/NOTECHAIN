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

const localNotes = vi.hoisted(
  () => [] as Array<{ id: string; title: string; content: string; updatedAt: Date }>
);

vi.mock('../../sync/noteSyncOperations', () => ({
  listLocalDecryptedNotes: async () => localNotes,
}));

import { createCalendarEvent, db } from '../../db';

function addSyncedNote(title: string, content: string) {
  localNotes.push({ id: `note-${localNotes.length + 1}`, title, content, updatedAt: new Date() });
}
import { buildMeetingPrepQuery, getMeetingPrepContext } from '../meetingPrepContext';

describe('meetingPrepContext', () => {
  beforeEach(async () => {
    localNotes.length = 0;
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
    addSyncedNote('Product Review Notes', '<p>Roadmap, launch risks, and follow-up questions.</p>');

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

  it('uses the linked calendar event shell title for prep when available', async () => {
    addSyncedNote('Quarterly Roadmap Notes', '<p>Timeline, launch risks, and dependencies.</p>');

    const calendarEventId = await createCalendarEvent({
      title: 'Quarterly Roadmap Review',
      description: 'Discuss launch planning',
      startDate: new Date('2024-01-15T10:00:00.000Z'),
      endDate: new Date('2024-01-15T11:00:00.000Z'),
      externalId: 'google-quarterly-review',
      source: 'google',
    });

    const context = await getMeetingPrepContext({
      meetingTitle: 'Team Standup',
      calendarEventId,
    });

    expect(context.source).toBe('calendar-event');
    expect(context.calendarEventId).toBe(calendarEventId);
    expect(context.query).toBe('quarterly roadmap review');
    expect(context.relatedNotes[0]).toMatchObject({
      type: 'note',
      title: 'Quarterly Roadmap Notes',
    });
  });
});
