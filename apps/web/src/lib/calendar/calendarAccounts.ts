import type { CalendarAccountState, CalendarEventShell, CalendarProvider } from './calendarTypes';

const ACCOUNT_LABELS: Record<CalendarProvider, string> = {
  google: 'Google Calendar',
  outlook: 'Outlook',
  apple: 'Apple Calendar',
};

export function buildCalendarAccountStates(events: CalendarEventShell[]): CalendarAccountState[] {
  return (Object.keys(ACCOUNT_LABELS) as CalendarProvider[]).map(provider => {
    const localEventCount = events.filter(event => event.source === provider).length;
    const isApple = provider === 'apple';

    return {
      provider,
      label: ACCOUNT_LABELS[provider],
      connection: localEventCount > 0 ? 'prototype' : 'not-connected',
      statusLabel:
        localEventCount > 0 ? 'Local prototype' : isApple ? 'Prototype only' : 'Available',
      localEventCount,
      canImport: !isApple,
      canPushTasks: !isApple,
    };
  });
}
