'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { CalendarView } from '@/components/CalendarView';
import { PrototypeNotice } from '@/components/PrototypeNotice';
import { FEATURES } from '@/lib/constants';
import {
  createCalendarAccess,
  type CalendarAccountState,
  type CalendarEventShell,
} from '@/lib/calendar/calendarAccess';

const calendarAccess = createCalendarAccess();

function isProviderEnabled(account: CalendarAccountState): boolean {
  if (account.provider === 'outlook' && !FEATURES.ENABLE_OUTLOOK_CALENDAR) return false;
  if (account.provider === 'apple' && !FEATURES.ENABLE_APPLE_CALENDAR) return false;
  return true;
}

function getProviderDotClass(provider: CalendarAccountState['provider']) {
  switch (provider) {
    case 'google':
      return 'bg-blue-500';
    case 'outlook':
      return 'bg-purple-500';
    default:
      return 'bg-stone-500';
  }
}

function getAccountCardClass(provider: CalendarAccountState['provider']) {
  switch (provider) {
    case 'google':
      return 'bg-blue-50';
    case 'outlook':
      return 'bg-purple-50';
    default:
      return 'bg-stone-50';
  }
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventShell[]>([]);
  const [accounts, setAccounts] = useState<CalendarAccountState[]>([]);

  const loadCalendarRouteState = useCallback(async () => {
    const routeState = await calendarAccess.getRouteState();
    setEvents(routeState.events);
    setAccounts(routeState.accounts);
  }, []);

  useEffect(() => {
    void loadCalendarRouteState();
  }, [loadCalendarRouteState]);

  const handleEventClick = useCallback((event: CalendarEventShell) => {
    console.log('Event clicked:', event);
  }, []);

  const handleCreateEvent = useCallback((date: Date) => {
    console.log('Create event at:', date);
  }, []);

  const upcomingEvents = useMemo(() => events.slice(0, 3), [events]);

  const headerActions = (
    <button
      onClick={() => handleCreateEvent(new Date())}
      className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm"
    >
      New Event
    </button>
  );

  return (
    <AppLayout pageTitle="Calendar" actions={headerActions}>
      <div className="py-8">
        <PrototypeNotice title="Calendar integration prototype">
          This route now reads local encrypted calendar event shells and provider-neutral account
          state. Seeded prototype data may still appear here until provider sync and lifecycle flows
          are real.
        </PrototypeNotice>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <CalendarView
              events={events}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              view="month"
            />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
              <h3 className="font-medium text-stone-900 mb-4">Upcoming</h3>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map(event => (
                    <button
                      key={event.id}
                      type="button"
                      className="w-full text-left p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full ${getProviderDotClass(event.source)}`}
                        />
                        <span className="text-sm font-medium text-stone-900 truncate">
                          {event.title}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {new Date(event.startDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">
                    No local calendar event shells yet. Connect a provider once sync is ready.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
              <h3 className="font-medium text-stone-900 mb-4">Connected Calendars</h3>
              <div className="space-y-2">
                {accounts.filter(isProviderEnabled).map(account => (
                  <div
                    key={account.provider}
                    className={`flex items-center justify-between p-2 rounded-lg ${getAccountCardClass(account.provider)}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${getProviderDotClass(account.provider)}`}
                      />
                      <div>
                        <p className="text-sm text-stone-700">{account.label}</p>
                        <p className="text-xs text-stone-500">
                          {account.localEventCount} local event
                          {account.localEventCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-amber-700 font-medium">
                      {account.statusLabel}
                    </span>
                  </div>
                ))}
                <button className="w-full p-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors border border-dashed border-stone-300">
                  + Connect Calendar
                </button>
              </div>
            </div>

            <div className="bg-amber-50/50 rounded-3xl border border-amber-100 p-6">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-900">Pro Tip</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Click on any event to transcribe meeting notes or inspect linked follow-up
                    context.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
