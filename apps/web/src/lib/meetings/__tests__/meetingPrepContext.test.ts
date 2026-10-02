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

import { createCalendarEvent, createNote, db } from '../../db';
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

  it('uses the linked calendar event shell title for prep when available', async () => {
    await createNote({
      title: 'Quarterly Roadmap Notes',
      content: 'Timeline, launch risks, and dependencies.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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
