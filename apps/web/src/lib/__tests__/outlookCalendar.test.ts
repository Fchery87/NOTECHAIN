import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OutlookCalendarService } from '../outlookCalendar';

let fetchMock: ReturnType<typeof vi.fn>;

describe('OutlookCalendarService', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  test('URL-encodes reserved characters in non-primary calendar IDs', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    });

    const calendarId = 'team/calendar?name=eng&ops';

    await OutlookCalendarService.syncFromOutlook('token-123', calendarId);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events?$top=100&$orderby=start/dateTime`,
      {
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  test('uses the primary calendar endpoint by default', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    });

    await OutlookCalendarService.syncFromOutlook('token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.microsoft.com/v1.0/me/calendar/events?$top=100&$orderby=start/dateTime',
      {
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );
  });
});
