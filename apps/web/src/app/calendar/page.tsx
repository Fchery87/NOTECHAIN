'use client';

import { useState, useCallback } from 'react';
import type { ExternalEvent } from '@notechain/data-models';
import AppLayout from '@/components/AppLayout';
import { CalendarView } from '@/components/CalendarView';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

// Mock events for demonstration
const mockEvents: ExternalEvent[] = [
  {
    id: 'evt-1',
    title: 'Team Standup',
    description: 'Daily team sync meeting',
    startDate: new Date(Date.now() + 86400000), // Tomorrow
    endDate: new Date(Date.now() + 86400000 + 1800000), // 30 min later
    source: 'google',
    externalId: 'google-1',
    isAllDay: false,
  },
  {
    id: 'evt-2',
    title: 'Product Review',
    description: 'Review Q1 product roadmap',
    startDate: new Date(Date.now() + 86400000 * 2 + 3600000), // Day after tomorrow
    endDate: new Date(Date.now() + 86400000 * 2 + 7200000), // 1 hour later
    source: 'outlook',
    externalId: 'outlook-1',
    isAllDay: false,
  },
  {
    id: 'evt-3',
    title: 'Design Workshop',
    description: 'UI/UX design brainstorming session',
    startDate: new Date(Date.now() + 86400000 * 3 + 46800000), // 1pm in 3 days
    endDate: new Date(Date.now() + 86400000 * 3 + 57600000), // 4pm
    source: 'apple',
    externalId: 'apple-1',
    isAllDay: false,
  },
];

export default function CalendarPage() {
  const [events] = useState<ExternalEvent[]>(mockEvents);

  const handleEventClick = useCallback((event: ExternalEvent) => {
    console.log('Event clicked:', event);
  }, []);

  const handleCreateEvent = useCallback((date: Date) => {
    console.log('Create event at:', date);
    // This would open an event creation modal
  }, []);

  const headerActions = (
    <>
      <SyncStatusIndicator />
      <button
        onClick={() => handleCreateEvent(new Date())}
        className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
      >
        + New Event
      </button>
    </>
  );

  return (
    <AppLayout pageTitle="Calendar" actions={headerActions}>
      <div className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar */}
          <div className="lg:col-span-3">
            <CalendarView
              events={events}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              view="month"
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upcoming Events */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
              <h3 className="font-medium text-stone-900 mb-4">Upcoming</h3>
              <div className="space-y-3">
                {events.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          event.source === 'google'
                            ? 'bg-blue-500'
                            : event.source === 'outlook'
                              ? 'bg-purple-500'
                              : 'bg-stone-500'
                        }`}
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
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Calendars */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
              <h3 className="font-medium text-stone-900 mb-4">Connected Calendars</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                    </svg>
                    <span className="text-sm text-stone-700">Google Calendar</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Connected</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-purple-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M21.17 3.25Q21.5 3.25 21.76 3.5 22 3.74 22 4.08V19.92Q22 20.26 21.76 20.5 21.5 20.75 21.17 20.75H7.83Q7.5 20.75 7.24 20.5 7 20.26 7 19.92V17H2.83Q2.5 17 2.24 16.76 2 16.5 2 16.17V7.83Q2 7.5 2.24 7.24 2.5 7 2.83 7H7V4.08Q7 3.74 7.24 3.5 7.5 3.25 7.83 3.25M7 13.06L8.18 15.28H9.97L8 12.06L9.93 8.89H8.22L7.13 10.9L7.09 10.96L7.06 11.03Q6.8 10.5 6.5 9.96 6.2 9.43 5.97 8.89H4.16L6.05 12.08L4 15.28H5.78M13.88 19.5V17H8.25V19.5M13.88 15.75V12.63H12V15.75M13.88 11.38V8.25H12V11.38M13.88 7V4.5H8.25V7M20.75 19.5V17H15.13V19.5M20.75 15.75V12.63H15.13V15.75M20.75 11.38V8.25H15.13V11.38M20.75 7V4.5H15.13V7Z" />
                    </svg>
                    <span className="text-sm text-stone-700">Outlook</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Connected</span>
                </div>
                <button className="w-full p-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors border border-dashed border-stone-300">
                  + Connect Calendar
                </button>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
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
                    Click on any event to transcribe meeting notes or view details.
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
