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

const calendarServiceMocks = vi.hoisted(() => ({
  pushToExternalCalendar: vi.fn(async () => 'provider-event-123'),
}));

const providerMocks = vi.hoisted(() => ({
  syncFromGoogle: vi.fn(),
  syncFromOutlook: vi.fn(),
}));

vi.mock('../../../services/calendar-service', () => ({
  CalendarService: {
    pushToExternalCalendar: calendarServiceMocks.pushToExternalCalendar,
  },
}));

vi.mock('../../googleCalendar', () => ({
  GoogleCalendarService: {
    syncFromGoogle: providerMocks.syncFromGoogle,
  },
}));

vi.mock('../../outlookCalendar', () => ({
  OutlookCalendarService: {
    syncFromOutlook: providerMocks.syncFromOutlook,
  },
}));

import { db } from '../../db';
import { createCalendarAccess } from '../calendarAccess';

describe('calendarAccess', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    await db.close();
  });

  it('returns provider-neutral route state backed by local event shells', async () => {
    const access = createCalendarAccess();

    const routeState = await access.getRouteState();

    expect(routeState.events).toHaveLength(3);
    expect(routeState.events.map(event => event.title)).toEqual([
      'Team Standup',
      'Product Review',
      'Design Workshop',
    ]);
    expect(routeState.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'google', localEventCount: 1 }),
        expect.objectContaining({ provider: 'outlook', localEventCount: 1 }),
        expect.objectContaining({ provider: 'apple', localEventCount: 1 }),
      ])
    );
  });

  it('persists a local event shell when pushing a task to a provider', async () => {
    const access = createCalendarAccess();

    const eventId = await access.pushTaskToProvider({
      id: 'task-1',
      title: 'Send follow-up notes',
      dueDate: new Date('2024-01-15T09:00:00.000Z'),
      provider: 'google',
      accessToken: 'token-123',
      calendarId: 'primary',
    });

    const events = await access.listEventShells();
    const storedEvent = events.find(event => event.externalId === eventId);

    expect(eventId).toBe('provider-event-123');
    expect(calendarServiceMocks.pushToExternalCalendar).toHaveBeenCalledWith(
      {
        id: 'task-1',
        title: 'Send follow-up notes',
        dueDate: new Date('2024-01-15T09:00:00.000Z'),
      },
      'primary',
      'google',
      'token-123'
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Send follow-up notes',
          source: 'google',
          externalId: 'provider-event-123',
          calendarId: 'primary',
        }),
      ])
    );
    expect(storedEvent).toEqual(expect.objectContaining({ calendarId: 'primary' }));
    await expect(access.getEventShell(storedEvent!.id)).resolves.toEqual(
      expect.objectContaining({ calendarId: 'primary' })
    );
  });

  it('normalizes missing import calendarId to primary for persisted shells', async () => {
    providerMocks.syncFromGoogle.mockResolvedValue([
      {
        id: 'google-1',
        title: 'Daily Sync',
        description: 'Imported from Google',
        startDate: new Date('2024-03-10T09:00:00.000Z'),
        endDate: new Date('2024-03-10T09:30:00.000Z'),
        externalId: 'provider-google-1',
        source: 'google',
      },
    ]);

    const access = createCalendarAccess();

    const events = await access.importProviderEvents({
      provider: 'google',
      accessToken: 'token-123',
    });
    const storedEvent = await access.getEventShell(events[0].id);

    expect(providerMocks.syncFromGoogle).toHaveBeenCalledWith('token-123', 'primary');
    expect(events).toEqual([
      expect.objectContaining({
        title: 'Daily Sync',
        source: 'google',
        externalId: 'provider-google-1',
        calendarId: 'primary',
      }),
    ]);
    expect(storedEvent).toEqual(expect.objectContaining({ calendarId: 'primary' }));
    await expect(access.listEventShells()).resolves.toEqual([
      expect.objectContaining({
        externalId: 'provider-google-1',
        calendarId: 'primary',
      }),
    ]);
  });

  it('passes the requested calendarId through Outlook imports', async () => {
    providerMocks.syncFromOutlook.mockResolvedValue([
      {
        id: 'outlook-1',
        title: 'Quarterly Review',
        description: 'Imported from Outlook',
        startDate: new Date('2024-03-10T10:00:00.000Z'),
        endDate: new Date('2024-03-10T11:00:00.000Z'),
        externalId: 'provider-outlook-1',
        source: 'outlook',
      },
    ]);

    const access = createCalendarAccess();

    const events = await access.importProviderEvents({
      provider: 'outlook',
      accessToken: 'token-123',
      calendarId: 'team-calendar',
    });
    const storedEvent = await access.getEventShell(events[0].id);

    expect(providerMocks.syncFromOutlook).toHaveBeenCalledWith('token-123', 'team-calendar');
    expect(events).toEqual([
      expect.objectContaining({
        title: 'Quarterly Review',
        source: 'outlook',
        externalId: 'provider-outlook-1',
        calendarId: 'team-calendar',
      }),
    ]);
    expect(storedEvent).toEqual(expect.objectContaining({ calendarId: 'team-calendar' }));
    await expect(access.listEventShells()).resolves.toEqual([
      expect.objectContaining({
        externalId: 'provider-outlook-1',
        calendarId: 'team-calendar',
      }),
    ]);
  });

  it('updates existing imported provider events instead of returning stale shells', async () => {
    providerMocks.syncFromGoogle
      .mockResolvedValueOnce([
        {
          id: 'google-1',
          title: 'Planning Session',
          description: 'Initial title',
          startDate: new Date('2024-04-01T09:00:00.000Z'),
          endDate: new Date('2024-04-01T10:00:00.000Z'),
          externalId: 'provider-google-1',
          source: 'google',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'google-1',
          title: 'Planning Session Updated',
          description: 'Updated title',
          startDate: new Date('2024-04-01T09:30:00.000Z'),
          endDate: new Date('2024-04-01T10:30:00.000Z'),
          externalId: 'provider-google-1',
          source: 'google',
        },
      ]);

    const access = createCalendarAccess();

    await access.importProviderEvents({
      provider: 'google',
      accessToken: 'token-123',
      calendarId: 'primary',
    });
    const refreshedEvents = await access.importProviderEvents({
      provider: 'google',
      accessToken: 'token-123',
      calendarId: 'primary',
    });

    expect(refreshedEvents).toEqual([
      expect.objectContaining({
        title: 'Planning Session Updated',
        description: 'Updated title',
        externalId: 'provider-google-1',
      }),
    ]);

    await expect(access.listEventShells()).resolves.toEqual([
      expect.objectContaining({
        title: 'Planning Session Updated',
        description: 'Updated title',
        externalId: 'provider-google-1',
      }),
    ]);
  });
});
