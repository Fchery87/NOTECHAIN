import { GoogleCalendarService } from '../googleCalendar';
import { OutlookCalendarService } from '../outlookCalendar';
import { CalendarService } from '../../services/calendar-service';
import { buildCalendarAccountStates } from './calendarAccounts';
import {
  ensurePrototypeCalendarEventShells,
  getLocalCalendarEventShell,
  listLocalCalendarEventShells,
  upsertLocalCalendarEventShell,
} from './calendarEventShells';
import type {
  CalendarAccess,
  CalendarProviderImportInput,
  CalendarTaskPushInput,
} from './calendarTypes';

export function createCalendarAccess(): CalendarAccess {
  return {
    async getRouteState() {
      const events = await ensurePrototypeCalendarEventShells();

      return {
        events,
        accounts: buildCalendarAccountStates(events),
      };
    },

    async listAccounts() {
      const events = await listLocalCalendarEventShells();
      return buildCalendarAccountStates(events);
    },

    listEventShells(range) {
      return listLocalCalendarEventShells(range);
    },

    getEventShell(eventId) {
      return getLocalCalendarEventShell(eventId);
    },

    async importProviderEvents(input: CalendarProviderImportInput) {
      const calendarId = input.calendarId ?? 'primary';
      const importedEvents =
        input.provider === 'google'
          ? await GoogleCalendarService.syncFromGoogle(input.accessToken, calendarId)
          : await OutlookCalendarService.syncFromOutlook(input.accessToken, calendarId);

      const storedEvents = await Promise.all(
        importedEvents.map(event =>
          upsertLocalCalendarEventShell({
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            source: event.source,
            externalId: event.externalId ?? event.id,
            calendarId,
            isAllDay: false,
          })
        )
      );

      return storedEvents.sort(
        (left, right) => left.startDate.getTime() - right.startDate.getTime()
      );
    },

    async pushTaskToProvider({
      accessToken,
      calendarId = 'primary',
      provider,
      ...task
    }: CalendarTaskPushInput) {
      const eventId = await CalendarService.pushToExternalCalendar(
        {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
        },
        calendarId,
        provider,
        accessToken
      );

      if (task.dueDate) {
        await upsertLocalCalendarEventShell({
          title: task.title,
          description: 'Created from a NoteChain task',
          startDate: task.dueDate,
          endDate: new Date(task.dueDate.getTime() + 60 * 60 * 1000),
          source: provider,
          externalId: eventId,
          calendarId,
          isAllDay: false,
        });
      }

      return eventId;
    },
  } satisfies CalendarAccess;
}

export type { CalendarAccess, CalendarAccountState, CalendarEventShell } from './calendarTypes';
