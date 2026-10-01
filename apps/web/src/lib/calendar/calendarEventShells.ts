import {
  createCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from '../db';
import type { CalendarEventShell, CalendarProvider } from './calendarTypes';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function normalizeCalendarId(calendarId?: string): string {
  return calendarId ?? 'primary';
}

const prototypeShellSeeds: Array<Omit<CalendarEventShell, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    title: 'Team Standup',
    description: 'Daily team sync meeting',
    startDate: new Date(Date.now() + DAY),
    endDate: new Date(Date.now() + DAY + 30 * 60 * 1000),
    source: 'google',
    externalId: 'prototype-google-1',
    calendarId: 'prototype-google',
    isAllDay: false,
  },
  {
    title: 'Product Review',
    description: 'Review Q1 product roadmap',
    startDate: new Date(Date.now() + 2 * DAY + HOUR),
    endDate: new Date(Date.now() + 2 * DAY + 2 * HOUR),
    source: 'outlook',
    externalId: 'prototype-outlook-1',
    calendarId: 'prototype-outlook',
    isAllDay: false,
  },
  {
    title: 'Design Workshop',
    description: 'UI/UX design brainstorming session',
    startDate: new Date(Date.now() + 3 * DAY + 13 * HOUR),
    endDate: new Date(Date.now() + 3 * DAY + 16 * HOUR),
    source: 'apple',
    externalId: 'prototype-apple-1',
    calendarId: 'prototype-apple',
    isAllDay: false,
  },
];

function toCalendarEventShell(
  event: NonNullable<Awaited<ReturnType<typeof getCalendarEvent>>>
): CalendarEventShell {
  if (!event) {
    throw new Error('Calendar event shell is required');
  }

  return {
    id: event.id!,
    title: event.title,
    description: event.description,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    source: event.source ?? 'apple',
    externalId: event.externalId ?? event.id!,
    calendarId: event.calendarId,
    location: undefined,
    isAllDay: false,
    recurrenceRule: undefined,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export async function listLocalCalendarEventShells(range?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<CalendarEventShell[]> {
  const events = await listCalendarEvents();
  const shells = events
    .map(event => toCalendarEventShell(event))
    .filter(event => {
      if (range?.startDate && event.endDate < range.startDate) {
        return false;
      }

      if (range?.endDate && event.startDate > range.endDate) {
        return false;
      }

      return true;
    })
    .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());

  return shells;
}

export async function getLocalCalendarEventShell(
  eventId: string
): Promise<CalendarEventShell | undefined> {
  const event = await getCalendarEvent(eventId);
  return event ? toCalendarEventShell(event) : undefined;
}

export async function upsertLocalCalendarEventShell(
  event: Omit<CalendarEventShell, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CalendarEventShell> {
  const calendarId = normalizeCalendarId(event.calendarId);
  const existing = await findLocalCalendarEventShellByExternalRef(
    event.source,
    calendarId,
    event.externalId
  );

  if (existing) {
    await updateCalendarEvent(existing.id, {
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      externalId: event.externalId,
      source: event.source,
      calendarId,
    });

    const updated = await getLocalCalendarEventShell(existing.id);

    if (!updated) {
      throw new Error('Failed to load updated calendar event shell');
    }

    return updated;
  }

  const id = await createCalendarEvent({
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    externalId: event.externalId,
    source: event.source,
    calendarId,
  });

  const stored = await getLocalCalendarEventShell(id);

  if (!stored) {
    throw new Error('Failed to load stored calendar event shell');
  }

  return stored;
}

export async function ensurePrototypeCalendarEventShells(): Promise<CalendarEventShell[]> {
  const existing = await listLocalCalendarEventShells();

  if (existing.length > 0) {
    return existing;
  }

  await Promise.all(prototypeShellSeeds.map(event => upsertLocalCalendarEventShell(event)));
  return listLocalCalendarEventShells();
}

async function findLocalCalendarEventShellByExternalRef(
  provider: CalendarProvider,
  calendarId: string,
  externalId: string
): Promise<CalendarEventShell | undefined> {
  const events = await listLocalCalendarEventShells();
  return events.find(
    event =>
      event.source === provider &&
      normalizeCalendarId(event.calendarId) === calendarId &&
      event.externalId === externalId
  );
}
