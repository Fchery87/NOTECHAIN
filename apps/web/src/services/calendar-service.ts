// apps/web/src/services/calendar-service.ts
/**
 * CalendarService provides privacy-preserving calendar integration
 * Supports Google Calendar, Outlook, and Apple Calendar
 */

/**
 * External calendar event from third-party providers
 */
export interface ExternalEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  source: 'google' | 'outlook' | 'apple';
}

/**
 * Task to push to external calendar
 */
export interface CalendarTask {
  id: string;
  title: string;
  dueDate?: Date;
}

/**
 * Calendar provider types
 */
export type CalendarProvider = 'google' | 'outlook' | 'apple';

/**
 * Sync result with events and metadata
 */
export interface SyncResult {
  events: ExternalEvent[];
  lastSyncTime: Date;
  provider: CalendarProvider;
}

/**
 * Calendar API error types
 */
export class CalendarError extends Error {
  constructor(
    message: string,
    public readonly provider: CalendarProvider,
    public readonly code: 'unauthorized' | 'network' | 'rate_limit' | 'unknown'
  ) {
    super(message);
    this.name = 'CalendarError';
  }
}

/**
 * CalendarService provides two-way sync with external calendar providers
 */
export class CalendarService {
  // API endpoints
  private static readonly GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
  private static readonly OUTLOOK_GRAPH_API = 'https://graph.microsoft.com/v1.0';

  /**
   * Sync with Google Calendar
   * @param accessToken OAuth2 access token
   * @param options Optional sync parameters
   * @returns Array of external events
   */
  static async syncWithGoogle(
    accessToken: string,
    options?: {
      calendarId?: string;
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
    }
  ): Promise<ExternalEvent[]> {
    try {
      const calendarId = options?.calendarId || 'primary';
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: String(options?.maxResults || 250),
      });

      if (options?.timeMin) {
        params.set('timeMin', options.timeMin.toISOString());
      }
      if (options?.timeMax) {
        params.set('timeMax', options.timeMax.toISOString());
      }

      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw await this.handleApiError(response, 'google');
      }

      const data = await response.json();

      return (data.items || []).map((item: Record<string, unknown>) => this.parseGoogleEvent(item));
    } catch (error) {
      if (error instanceof CalendarError) throw error;
      throw new CalendarError(
        error instanceof Error ? error.message : 'Failed to sync with Google Calendar',
        'google',
        'unknown'
      );
    }
  }

  /**
   * Sync with Outlook Calendar
   * @param accessToken OAuth2 access token
   * @param options Optional sync parameters
   * @returns Array of external events
   */
  static async syncWithOutlook(
    accessToken: string,
    options?: {
      calendarId?: string;
      startDateTime?: Date;
      endDateTime?: Date;
    }
  ): Promise<ExternalEvent[]> {
    try {
      const params = new URLSearchParams({
        $orderby: 'start/dateTime',
        $top: '100',
      });

      if (options?.startDateTime) {
        params.set('startDateTime', options.startDateTime.toISOString());
      }
      if (options?.endDateTime) {
        params.set('endDateTime', options.endDateTime.toISOString());
      }

      const endpoint = options?.calendarId
        ? `${this.OUTLOOK_GRAPH_API}/me/calendars/${options.calendarId}/events`
        : `${this.OUTLOOK_GRAPH_API}/me/calendar/events`;

      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw await this.handleApiError(response, 'outlook');
      }

      const data = await response.json();

      return (data.value || []).map((item: Record<string, unknown>) =>
        this.parseOutlookEvent(item)
      );
    } catch (error) {
      if (error instanceof CalendarError) throw error;
      throw new CalendarError(
        error instanceof Error ? error.message : 'Failed to sync with Outlook Calendar',
        'outlook',
        'unknown'
      );
    }
  }

  /**
   * Push a NoteChain task to an external calendar
   * @param task The task to push
   * @param calendarId Target calendar ID (use 'primary' for default)
   * @param provider Target calendar provider
   * @param accessToken OAuth2 access token
   * @returns The created event ID
   */
  static async pushToExternalCalendar(
    task: CalendarTask,
    calendarId: string,
    provider: CalendarProvider,
    accessToken: string
  ): Promise<string> {
    try {
      switch (provider) {
        case 'google':
          return await this.pushToGoogle(task, calendarId, accessToken);
        case 'outlook':
          return await this.pushToOutlook(task, calendarId, accessToken);
        case 'apple':
          throw new CalendarError(
            'Apple Calendar sync requires iCloud integration. Use CalDAV protocol.',
            'apple',
            'unknown'
          );
        default:
          throw new CalendarError(`Unsupported provider: ${provider}`, provider, 'unknown');
      }
    } catch (error) {
      if (error instanceof CalendarError) throw error;
      throw new CalendarError(
        error instanceof Error ? error.message : 'Failed to push to calendar',
        provider,
        'unknown'
      );
    }
  }

  /**
   * Delete an event from external calendar
   * @param eventId The event ID to delete
   * @param calendarId Calendar containing the event
   * @param provider Calendar provider
   * @param accessToken OAuth2 access token
   */
  static async deleteEvent(
    eventId: string,
    calendarId: string,
    provider: CalendarProvider,
    accessToken: string
  ): Promise<void> {
    try {
      let url: string;

      switch (provider) {
        case 'google':
          url = `${this.GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
          break;
        case 'outlook':
          url = `${this.OUTLOOK_GRAPH_API}/me/calendars/${calendarId}/events/${eventId}`;
          break;
        default:
          throw new CalendarError(`Delete not supported for ${provider}`, provider, 'unknown');
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 410) {
        // 410 = already deleted
        throw await this.handleApiError(response, provider);
      }
    } catch (error) {
      if (error instanceof CalendarError) throw error;
      throw new CalendarError(
        error instanceof Error ? error.message : 'Failed to delete event',
        provider,
        'unknown'
      );
    }
  }

  /**
   * Get available calendars for a provider
   * @param provider Calendar provider
   * @param accessToken OAuth2 access token
   * @returns List of calendar IDs and names
   */
  static async getAvailableCalendars(
    provider: CalendarProvider,
    accessToken: string
  ): Promise<Array<{ id: string; name: string; primary: boolean }>> {
    try {
      switch (provider) {
        case 'google': {
          const response = await fetch(`${this.GOOGLE_CALENDAR_API}/users/me/calendarList`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            throw await this.handleApiError(response, provider);
          }

          const data = await response.json();
          return (data.items || []).map((cal: Record<string, unknown>) => ({
            id: cal.id as string,
            name: cal.summary as string,
            primary: cal.primary === true,
          }));
        }

        case 'outlook': {
          const response = await fetch(`${this.OUTLOOK_GRAPH_API}/me/calendars`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            throw await this.handleApiError(response, provider);
          }

          const data = await response.json();
          return (data.value || []).map((cal: Record<string, unknown>) => ({
            id: cal.id as string,
            name: cal.name as string,
            primary: cal.isDefaultCalendar === true,
          }));
        }

        default:
          throw new CalendarError(
            `Calendar listing not supported for ${provider}`,
            provider,
            'unknown'
          );
      }
    } catch (error) {
      if (error instanceof CalendarError) throw error;
      throw new CalendarError(
        error instanceof Error ? error.message : 'Failed to get calendars',
        provider,
        'unknown'
      );
    }
  }

  // Private helper methods

  /**
   * Push task to Google Calendar
   */
  private static async pushToGoogle(
    task: CalendarTask,
    calendarId: string,
    accessToken: string
  ): Promise<string> {
    const eventDate = task.dueDate || new Date();
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);

    const event = {
      summary: task.title,
      description: `Created in NoteChain\nTask ID: ${task.id}`,
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      extendedProperties: {
        private: {
          notechainTaskId: task.id,
          notechainSource: 'true',
        },
      },
    };

    const response = await fetch(
      `${this.GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw await this.handleApiError(response, 'google');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Push task to Outlook Calendar
   */
  private static async pushToOutlook(
    task: CalendarTask,
    calendarId: string,
    accessToken: string
  ): Promise<string> {
    const eventDate = task.dueDate || new Date();
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);

    const event = {
      subject: task.title,
      body: {
        contentType: 'text',
        content: `Created in NoteChain\nTask ID: ${task.id}`,
      },
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      isReminderOn: true,
      reminderMinutesBeforeStart: 15,
    };

    const endpoint =
      calendarId === 'primary'
        ? `${this.OUTLOOK_GRAPH_API}/me/calendar/events`
        : `${this.OUTLOOK_GRAPH_API}/me/calendars/${calendarId}/events`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw await this.handleApiError(response, 'outlook');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Parse Google Calendar event to ExternalEvent
   */
  private static parseGoogleEvent(item: Record<string, unknown>): ExternalEvent {
    const start = item.start as Record<string, string>;
    const end = item.end as Record<string, string>;

    return {
      id: item.id as string,
      title: (item.summary as string) || 'Untitled',
      description: item.description as string | undefined,
      startDate: new Date(start?.dateTime || start?.date || ''),
      endDate: new Date(end?.dateTime || end?.date || ''),
      source: 'google',
    };
  }

  /**
   * Parse Outlook event to ExternalEvent
   */
  private static parseOutlookEvent(item: Record<string, unknown>): ExternalEvent {
    const start = item.start as Record<string, string>;
    const end = item.end as Record<string, string>;

    return {
      id: item.id as string,
      title: (item.subject as string) || 'Untitled',
      description: (item.body as Record<string, string>)?.content,
      startDate: new Date(start?.dateTime || ''),
      endDate: new Date(end?.dateTime || ''),
      source: 'outlook',
    };
  }

  /**
   * Handle API errors and convert to CalendarError
   */
  private static async handleApiError(
    response: Response,
    provider: CalendarProvider
  ): Promise<CalendarError> {
    let errorCode: CalendarError['code'] = 'unknown';

    switch (response.status) {
      case 401:
      case 403:
        errorCode = 'unauthorized';
        break;
      case 429:
        errorCode = 'rate_limit';
        break;
      case 503:
      case 502:
      case 504:
        errorCode = 'network';
        break;
    }

    let message = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData.error?.message || errorData.message || message;
    } catch {
      // Ignore JSON parse errors
    }

    return new CalendarError(message, provider, errorCode);
  }
}
