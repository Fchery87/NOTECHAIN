import type { Todo } from '@notechain/data-models';

/**
 * Outlook Calendar Service
 * US-3.2: Privacy-Preserving Calendar Link
 * Two-way sync with Microsoft Outlook Calendar
 */

export interface OutlookCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  externalId?: string;
  source: 'outlook';
}

export class OutlookCalendarService {
  private static readonly BASE_URL = 'https://graph.microsoft.com/v1.0/me';

  /**
   * Syncs events from Outlook Calendar to NoteChain
   * @param accessToken Microsoft Graph access token
   * @returns Array of calendar events
   */
  static async syncFromOutlook(accessToken: string): Promise<OutlookCalendarEvent[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/calendar/events?$top=100&$orderby=start/dateTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed: Invalid access token');
        }
        throw new Error(`Outlook Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseEvents(data.value || []);
    } catch (error) {
      console.error('Failed to sync from Outlook Calendar:', error);
      throw error;
    }
  }

  /**
   * Pushes NoteChain todo to Outlook Calendar
   * @param todo Todo to push
   * @param accessToken Microsoft Graph access token
   */
  static async pushToOutlook(todo: Todo, accessToken: string): Promise<void> {
    try {
      const event = this.todoToEvent(todo);
      const method = todo.externalId ? 'PATCH' : 'POST';
      const url = todo.externalId
        ? `${this.BASE_URL}/calendar/events/${todo.externalId}`
        : `${this.BASE_URL}/calendar/events`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Failed to push to Outlook Calendar: ${response.status}`);
      }

      // Store Outlook event ID as external ID
      const responseData = await response.json();
      if (!todo.externalId && responseData.id) {
        todo.externalId = responseData.id;
      }
    } catch (error) {
      console.error('Failed to push to Outlook Calendar:', error);
      throw error;
    }
  }

  /**
   * Deletes event from Outlook Calendar
   * @param eventId Outlook event ID
   * @param accessToken Microsoft Graph access token
   */
  static async deleteFromOutlook(eventId: string, accessToken: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete from Outlook Calendar: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete from Outlook Calendar:', error);
      throw error;
    }
  }

  /**
   * Converts Microsoft Graph event to NoteChain format
   * @param items Array of Outlook event items
   * @returns Array of NoteChain calendar events
   */
  private static parseEvents(items: any[]): OutlookCalendarEvent[] {
    return items
      .filter(item => item.showAs !== 'free' && !item.isCancelled)
      .map(item => ({
        id: `outlook-${item.id}`,
        title: item.subject || 'Untitled',
        description: item.bodyPreview || item.body?.content,
        startDate: new Date(item.start.dateTime || item.start.date),
        endDate: new Date(item.end.dateTime || item.end.date),
        externalId: item.id,
        source: 'outlook',
      }));
  }

  /**
   * Converts NoteChain todo to Outlook event format
   * @param todo NoteChain todo
   * @returns Microsoft Graph event object
   */
  private static todoToEvent(todo: Todo): any {
    const event: any = {
      subject: todo.title,
      body: {
        contentType: 'HTML',
        content: todo.description || `Created in NoteChain`,
      },
    };

    // Set start/end times based on due date
    if (todo.dueDate) {
      const dueDate = new Date(todo.dueDate);
      event.start = {
        dateTime: dueDate.toISOString(),
        timeZone: 'UTC',
      };
      // Default 1 hour duration
      event.end = {
        dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'UTC',
      };
    } else {
      // Default to today if no due date
      const today = new Date();
      event.start = {
        dateTime: today.toISOString(),
        timeZone: 'UTC',
      };
      event.end = {
        dateTime: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        timeZone: 'UTC',
      };
    }

    // Only include ID if updating existing event
    if (todo.externalId) {
      event.id = todo.externalId;
    }

    return event;
  }

  /**
   * Initiates Microsoft OAuth flow
   * @returns Promise resolving to authorization URL
   */
  static async initiateOAuth(): Promise<string> {
    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback/microsoft`;
    const scopes = ['Calendars.ReadWrite', 'User.Read'].join(' ');

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&response_mode=query`;

    return authUrl;
  }

  /**
   * Exchanges OAuth code for access token
   * @param code Authorization code
   * @returns Access token
   */
  static async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${window.location.origin}/auth/callback/microsoft`;

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
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
        scope: 'Calendars.ReadWrite User.Read',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const data = await response.json();
    return data.access_token;
  }
}
