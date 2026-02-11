import type { Todo } from '@notechain/data-models';

/**
 * Google Calendar Service
 * US-3.2: Privacy-Preserving Calendar Link
 * Two-way sync with Google Calendar
 */

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  externalId?: string;
  source: 'google';
}

export class GoogleCalendarService {
  private static readonly BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars';

  /**
   * Syncs events from Google Calendar to NoteChain
   * @param accessToken Google OAuth access token
   * @param calendarId Calendar ID (default: 'primary')
   * @returns Array of calendar events
   */
  static async syncFromGoogle(
    accessToken: string,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/${calendarId}/events`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed: Invalid access token');
        }
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseEvents(data.items || []);
    } catch (error) {
      console.error('Failed to sync from Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Pushes NoteChain todo to Google Calendar
   * @param todo Todo to push
   * @param calendarId Target calendar ID
   * @param accessToken Google OAuth access token
   */
  static async pushToGoogle(
    todo: Todo,
    calendarId: string = 'primary',
    accessToken: string
  ): Promise<void> {
    try {
      const event = this.todoToEvent(todo);
      const url = todo.externalId
        ? `${this.BASE_URL}/${calendarId}/events/${todo.externalId}`
        : `${this.BASE_URL}/${calendarId}/events`;

      const method = todo.externalId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Failed to push to Google Calendar: ${response.status}`);
      }

      // Store Google event ID as external ID
      const responseData = await response.json();
      if (!todo.externalId && responseData.id) {
        todo.externalId = responseData.id;
      }
    } catch (error) {
      console.error('Failed to push to Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Deletes event from Google Calendar
   * @param eventId Google event ID
   * @param calendarId Calendar ID
   * @param accessToken Google OAuth access token
   */
  static async deleteFromGoogle(
    eventId: string,
    calendarId: string = 'primary',
    accessToken: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/${calendarId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete from Google Calendar: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete from Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Converts Google API event to NoteChain format
   * @param items Array of Google event items
   * @returns Array of NoteChain calendar events
   */
  private static parseEvents(items: any[]): GoogleCalendarEvent[] {
    return items
      .filter(item => item.status !== 'cancelled')
      .map(item => ({
        id: `google-${item.id}`,
        title: item.summary || 'Untitled',
        description: item.description,
        startDate: this.parseDate(item.start),
        endDate: this.parseDate(item.end),
        externalId: item.id,
        source: 'google',
      }));
  }

  /**
   * Parses date from Google event
   * @param dateObj Google date object
   * @returns Date object
   */
  private static parseDate(dateObj: any): Date {
    if (dateObj.dateTime) {
      return new Date(dateObj.dateTime);
    } else if (dateObj.date) {
      // All-day event - set to midnight UTC
      return new Date(dateObj.date);
    }
    return new Date();
  }

  /**
   * Converts NoteChain todo to Google event format
   * @param todo NoteChain todo
   * @returns Google event object
   */
  private static todoToEvent(todo: Todo): any {
    const event: any = {
      summary: todo.title,
      description: todo.description || `Created in NoteChain`,
    };

    // Set start/end times based on due date
    if (todo.dueDate) {
      const dueDate = new Date(todo.dueDate);
      event.start = {
        dateTime: dueDate.toISOString(),
      };
      // Default 1 hour duration
      event.end = {
        dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
      };
    } else {
      // Default to today if no due date
      const today = new Date();
      event.start = {
        date: today.toISOString().split('T')[0],
      };
      event.end = {
        date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
    }

    return event;
  }

  /**
   * Initiates Google OAuth flow
   * @returns Promise resolving to authorization URL
   */
  static async initiateOAuth(): Promise<string> {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback/google`;
    const scopes = ['https://www.googleapis.com/auth/calendar.events'].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scopes)}`;

    return authUrl;
  }

  /**
   * Exchanges OAuth code for access token
   * @param code Authorization code
   * @returns Access token
   */
  static async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${window.location.origin}/auth/callback/google`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const data = await response.json();
    return data.access_token;
  }
}
