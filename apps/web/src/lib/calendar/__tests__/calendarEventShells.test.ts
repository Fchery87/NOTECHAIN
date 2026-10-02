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
import {
  getLocalCalendarEventShell,
  listLocalCalendarEventShells,
  upsertLocalCalendarEventShell,
} from '../calendarEventShells';

describe('calendarEventShells', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    await db.close();
  });

  it('persists calendarId through create, get, and list round-trips', async () => {
    const stored = await upsertLocalCalendarEventShell({
      title: 'Imported team meeting',
      description: 'Imported from a secondary calendar',
      startDate: new Date('2024-03-10T10:00:00.000Z'),
      endDate: new Date('2024-03-10T11:00:00.000Z'),
      source: 'outlook',
      externalId: 'provider-outlook-1',
      calendarId: 'team-calendar',
      isAllDay: false,
    });

    const loaded = await getLocalCalendarEventShell(stored.id);
    const listed = await listLocalCalendarEventShells();

    expect(stored).toEqual(expect.objectContaining({ calendarId: 'team-calendar' }));
    expect(loaded).toEqual(expect.objectContaining({ calendarId: 'team-calendar' }));
    expect(listed).toEqual([
      expect.objectContaining({
        externalId: 'provider-outlook-1',
        calendarId: 'team-calendar',
      }),
    ]);
  });

  it('persists calendarId updates when an existing shell is refreshed', async () => {
    const original = await upsertLocalCalendarEventShell({
      title: 'Planning Session',
      description: 'Original import',
      startDate: new Date('2024-04-01T09:00:00.000Z'),
      endDate: new Date('2024-04-01T10:00:00.000Z'),
      source: 'google',
      externalId: 'provider-google-1',
      calendarId: 'team-alpha',
      isAllDay: false,
    });

    const updated = await upsertLocalCalendarEventShell({
      title: 'Planning Session Updated',
      description: 'Refreshed import',
      startDate: new Date('2024-04-01T09:30:00.000Z'),
      endDate: new Date('2024-04-01T10:30:00.000Z'),
      source: 'google',
      externalId: 'provider-google-1',
      calendarId: 'team-alpha',
      isAllDay: false,
    });

    const loaded = await getLocalCalendarEventShell(original.id);
    const listed = await listLocalCalendarEventShells();

    expect(updated).toEqual(
      expect.objectContaining({
        id: original.id,
        title: 'Planning Session Updated',
        calendarId: 'team-alpha',
      })
    );
    expect(loaded).toEqual(expect.objectContaining({ calendarId: 'team-alpha' }));
    expect(listed).toEqual([
      expect.objectContaining({
        id: original.id,
        calendarId: 'team-alpha',
      }),
    ]);
  });

  it('keeps same-provider external IDs distinct across calendars', async () => {
    const alpha = await upsertLocalCalendarEventShell({
      title: 'Alpha Planning Session',
      description: 'Imported from team alpha',
      startDate: new Date('2024-04-01T09:00:00.000Z'),
      endDate: new Date('2024-04-01T10:00:00.000Z'),
      source: 'google',
      externalId: 'provider-google-shared',
      calendarId: 'team-alpha',
      isAllDay: false,
    });

    const beta = await upsertLocalCalendarEventShell({
      title: 'Beta Planning Session',
      description: 'Imported from team beta',
      startDate: new Date('2024-04-02T09:00:00.000Z'),
      endDate: new Date('2024-04-02T10:00:00.000Z'),
      source: 'google',
      externalId: 'provider-google-shared',
      calendarId: 'team-beta',
      isAllDay: false,
    });

    const refreshedAlpha = await upsertLocalCalendarEventShell({
      title: 'Alpha Planning Session Updated',
      description: 'Refreshed import for alpha only',
      startDate: new Date('2024-04-01T09:30:00.000Z'),
      endDate: new Date('2024-04-01T10:30:00.000Z'),
      source: 'google',
      externalId: 'provider-google-shared',
      calendarId: 'team-alpha',
      isAllDay: false,
    });

    const listed = await listLocalCalendarEventShells();

    expect(beta.id).not.toBe(alpha.id);
    expect(refreshedAlpha.id).toBe(alpha.id);
    expect(listed).toHaveLength(2);
    expect(listed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: alpha.id,
          title: 'Alpha Planning Session Updated',
          calendarId: 'team-alpha',
          externalId: 'provider-google-shared',
        }),
        expect.objectContaining({
          id: beta.id,
          title: 'Beta Planning Session',
          calendarId: 'team-beta',
          externalId: 'provider-google-shared',
        }),
      ])
    );
  });
});
