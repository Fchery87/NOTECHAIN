import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GoogleCalendarService } from '../googleCalendar';

describe('Google Calendar Service', () => {
  const mockAccessToken = 'mock-access-token';
  const mockCalendarId = 'primary';

  beforeEach(() => {
    // Setup test environment
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Sync from Google Calendar', () => {
    it('should fetch calendar events with proper headers', async () => {
      const mockResponse = {
        items: [
          {
            id: 'event-1',
            summary: 'Test Event',
            description: 'Test Description',
            start: { dateTime: '2024-01-01T10:00:00Z' },
            end: { dateTime: '2024-01-01T11:00:00Z' },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const events = await GoogleCalendarService.syncFromGoogle(mockAccessToken, mockCalendarId);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        }
      );
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Test Event');
      expect(events[0].source).toBe('google');
    });

    it('should handle all-day events', async () => {
      const mockResponse = {
        items: [
          {
            id: 'event-1',
            summary: 'All Day Event',
            start: { date: '2024-01-01' },
            end: { date: '2024-01-02' },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const events = await GoogleCalendarService.syncFromGoogle(mockAccessToken, mockCalendarId);

      expect(events[0].startDate).toBeInstanceOf(Date);
      expect(events[0].endDate).toBeInstanceOf(Date);
    });
  });

  describe('Push to Google Calendar', () => {
    it('should push todo as calendar event', async () => {
      const todo = {
        id: 'todo-1',
        title: 'Test Todo',
        dueDate: new Date('2024-01-01T10:00:00Z'),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'google-event-1' }),
      });

      await GoogleCalendarService.pushToGoogle(todo, mockCalendarId, mockAccessToken);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test Todo'),
        }
      );
    });

    it('should update existing calendar event', async () => {
      const todo = {
        id: 'todo-1',
        title: 'Updated Todo',
        dueDate: new Date('2024-01-01T10:00:00Z'),
        externalId: 'google-event-1',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'google-event-1' }),
      });

      await GoogleCalendarService.pushToGoogle(todo, mockCalendarId, mockAccessToken);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events/google-event-1',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error on invalid access token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(
        GoogleCalendarService.syncFromGoogle('invalid-token', mockCalendarId)
      ).rejects.toThrow('Authentication failed');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        GoogleCalendarService.syncFromGoogle(mockAccessToken, mockCalendarId)
      ).rejects.toThrow('Network error');
    });
  });
});
