import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CalendarService } from '../calendar-service';

let fetchMock: ReturnType<typeof vi.fn>;

describe('CalendarService.syncWithOutlook', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  test('uses the primary Outlook sync endpoint for the primary calendar', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    });

    await CalendarService.syncWithOutlook('token-123', { calendarId: 'primary' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.microsoft.com/v1.0/me/calendar/events?%24orderby=start%2FdateTime&%24top=100',
      {
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  test('URL-encodes reserved characters in non-primary Outlook calendar IDs', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    });

    const calendarId = 'team/calendar?name=eng&ops';

    await CalendarService.syncWithOutlook('token-456', { calendarId });

    expect(fetchMock).toHaveBeenCalledWith(
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events?%24orderby=start%2FdateTime&%24top=100`,
      {
        headers: {
          Authorization: 'Bearer token-456',
          'Content-Type': 'application/json',
        },
      }
    );
  });
});

describe('CalendarService.pushToExternalCalendar', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  test('URL-encodes reserved characters when pushing to non-primary Outlook calendars', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'event-789' }),
    });

    const calendarId = 'team/calendar?name=eng&ops';
    const eventId = await CalendarService.pushToExternalCalendar(
      {
        id: 'task-123',
        title: 'Ship launch checklist',
        dueDate: new Date('2024-01-15T09:00:00.000Z'),
      },
      calendarId,
      'outlook',
      'token-789'
    );

    expect(eventId).toBe('event-789');
    expect(fetchMock).toHaveBeenCalledWith(
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-789',
          'Content-Type': 'application/json',
        },
      })
    );
  });
});

describe('CalendarService.deleteEvent', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  test('uses the primary Outlook delete endpoint for the primary calendar', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await CalendarService.deleteEvent('event-123', 'primary', 'outlook', 'token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.microsoft.com/v1.0/me/calendar/events/event-123',
      {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer token-123',
        },
      }
    );
  });

  test('URL-encodes reserved characters in non-primary Outlook calendar IDs', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const calendarId = 'team/calendar?name=eng&ops';

    await CalendarService.deleteEvent('event-456', calendarId, 'outlook', 'token-456');

    expect(fetchMock).toHaveBeenCalledWith(
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/event-456`,
      {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer token-456',
        },
      }
    );
  });
});
