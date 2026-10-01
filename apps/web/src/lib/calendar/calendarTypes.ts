import type { ExternalEvent } from '@notechain/data-models';

export type CalendarProvider = 'google' | 'outlook' | 'apple';

export type CalendarEventShell = ExternalEvent;

export interface CalendarAccountState {
  provider: CalendarProvider;
  label: string;
  connection: 'prototype' | 'not-connected';
  statusLabel: string;
  localEventCount: number;
  canImport: boolean;
  canPushTasks: boolean;
}

export interface CalendarTaskPushInput {
  id: string;
  title: string;
  dueDate?: Date;
  provider: CalendarProvider;
  accessToken: string;
  calendarId?: string;
}

export interface CalendarProviderImportInput {
  provider: Exclude<CalendarProvider, 'apple'>;
  accessToken: string;
  calendarId?: string;
}

export interface CalendarAccess {
  getRouteState(): Promise<{
    accounts: CalendarAccountState[];
    events: CalendarEventShell[];
  }>;
  listAccounts(): Promise<CalendarAccountState[]>;
  listEventShells(range?: { startDate?: Date; endDate?: Date }): Promise<CalendarEventShell[]>;
  getEventShell(eventId: string): Promise<CalendarEventShell | undefined>;
  importProviderEvents(input: CalendarProviderImportInput): Promise<CalendarEventShell[]>;
  pushTaskToProvider(input: CalendarTaskPushInput): Promise<string>;
}
