'use client';

import React, { useState, useCallback } from 'react';
import type { ExternalEvent } from '@notechain/data-models';
import { CalendarEventTranscript } from './CalendarEventTranscript';

/**
 * Props for CalendarView component
 */
export interface CalendarViewProps {
  events: ExternalEvent[];
  onEventClick?: (event: ExternalEvent) => void;
  onCreateEvent?: (date: Date) => void;
  view?: 'day' | 'week' | 'month';
  initialDate?: Date;
}

/**
 * Calendar view types
 */
type CalendarView = 'day' | 'week' | 'month';

/**
 * CalendarView component - Displays calendar with day/week/month views
 * FR-CAL-01: Two-way sync with Google Calendar, Outlook, Apple Calendar
 * FR-CAL-02: Display external events in-app
 * FR-CAL-03: Calendar view (day, week, month)
 */
export function CalendarView({
  events,
  onEventClick,
  onCreateEvent,
  view: initialView = 'month',
  initialDate,
}: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate ?? new Date());
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Handle event click - show event details
  const handleEventClick = useCallback(
    (event: ExternalEvent) => {
      setSelectedEvent(event);
      setShowEventDetails(true);
      onEventClick?.(event);
    },
    [onEventClick]
  );

  // Close event details modal
  const handleCloseEventDetails = useCallback(() => {
    setShowEventDetails(false);
    setSelectedEvent(null);
  }, []);

  // Handle transcribe from calendar event
  const handleTranscribe = useCallback((_eventId: string) => {
    // Callback when user initiates transcription
    // The modal is already handled by CalendarEventTranscript
  }, []);

  // Handle view meeting
  const handleViewMeeting = useCallback((meetingId: string) => {
    // Navigate to meeting detail page or show meeting details
    // This will be implemented based on the routing system
    console.log('View meeting:', meetingId);
  }, []);

  // Get days in month
  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding days from previous month
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      const paddingDay = new Date(year, month, 1 - (startDay - i));
      days.push(paddingDay);
    }

    // Add actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    // Add padding days from next month
    const endDay = lastDay.getDay();
    const paddingNeeded = 6 - endDay;
    for (let i = 1; i <= paddingNeeded; i++) {
      const paddingDay = new Date(year, month + 1, i);
      days.push(paddingDay);
    }

    return days;
  }, []);

  // Get week day names
  const getWeekDayNames = useCallback(() => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, []);

  // Get month name
  const getMonthName = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long' });
  }, []);

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date) => {
      return events.filter(event => {
        const eventDate = new Date(event.startDate);
        return (
          eventDate.toDateString() === date.toDateString() ||
          (event.startDate <= date && event.endDate >= date)
        );
      });
    },
    [events]
  );

  // Navigate to previous/next
  const navigatePrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, currentView]);

  const navigateNext = useCallback(() => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, currentView]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Check if date is today
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Check if date is in current month
  const isCurrentMonth = useCallback(
    (date: Date) => {
      return (
        date.getMonth() === currentDate.getMonth() &&
        date.getFullYear() === currentDate.getFullYear()
      );
    },
    [currentDate]
  );

  // Get week days for week view
  const getWeekDays = useCallback((date: Date) => {
    const weekDays: Date[] = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(new Date(day));
    }

    return weekDays;
  }, []);

  // Get hours for day view
  const getHours = useCallback(() => {
    const hours: Date[] = [];
    for (let i = 0; i < 24; i++) {
      const hour = new Date(currentDate);
      hour.setHours(i);
      hours.push(new Date(hour));
    }
    return hours;
  }, [currentDate]);

  // Get events for hour
  const getEventsForHour = useCallback(
    (hour: Date) => {
      return events.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        const hourStart = new Date(hour);
        const hourEnd = new Date(hour);
        hourEnd.setHours(hour.getHours() + 1);

        return eventStart < hourEnd && eventEnd > hourStart;
      });
    },
    [events]
  );

  // Render month view
  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const weekDays = getWeekDayNames();

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={navigatePrevious}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7 7V5"
              />
            </svg>
          </button>
          <h2 className="text-lg font-serif font-medium text-stone-900">
            {getMonthName(currentDate)} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={navigateNext}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7V5"
              />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-stone-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isPaddingDay = !isCurrentMonth(day);

            return (
              <div
                key={index}
                className={`
                  min-h-[100px] p-1 border border-stone-200
                  ${isToday(day) ? 'bg-amber-50 border-amber-200' : 'bg-white'}
                  ${isPaddingDay ? 'bg-stone-50 text-stone-400' : ''}
                  hover:border-stone-300 transition-colors
                `}
              >
                <div className="text-sm font-medium text-stone-700 mb-1">{day.getDate()}</div>
                {dayEvents.length > 0 && (
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        onClick={() => handleEventClick(event)}
                        className={`
                          text-xs px-1.5 py-0.5 rounded truncate cursor-pointer
                          ${
                            event.source === 'google'
                              ? 'bg-blue-100 text-blue-800'
                              : event.source === 'outlook'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-stone-100 text-stone-800'
                          }
                        `}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-stone-500 text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const hours = getHours();

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={navigatePrevious}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7 7V5"
              />
            </svg>
          </button>
          <h2 className="text-lg font-serif font-medium text-stone-900">
            Week of {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </h2>
          <button
            onClick={navigateNext}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Next week"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7V5"
              />
            </svg>
          </button>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-8 gap-1">
          {/* Time column */}
          <div className="space-y-1">
            {hours.map((hour, i) => (
              <div key={i} className="h-16 text-xs text-stone-500 text-right pr-2">
                {hour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="space-y-1">
              {hours.map((hour, hourIndex) => {
                const hourEvents = getEventsForHour(hour);
                const dayEvents = hourEvents.filter(e => {
                  const eventDate = new Date(e.startDate);
                  return eventDate.toDateString() === day.toDateString();
                });

                return (
                  <div key={hourIndex} className="h-16 border-t border-stone-100 relative">
                    {dayEvents.length > 0 && (
                      <div className="absolute inset-0 p-1 space-y-0.5 overflow-hidden">
                        {dayEvents.map((event, i) => (
                          <div
                            key={i}
                            onClick={() => handleEventClick(event)}
                            className={`
                              text-xs px-1.5 py-0.5 rounded truncate cursor-pointer
                              ${
                                event.source === 'google'
                                  ? 'bg-blue-100 text-blue-800'
                                  : event.source === 'outlook'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-stone-100 text-stone-800'
                              }
                            `}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = getHours();

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={navigatePrevious}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Previous day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7 7V5"
              />
            </svg>
          </button>
          <h2 className="text-lg font-serif font-medium text-stone-900">
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
          <button
            onClick={navigateToday}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Next day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7V5"
              />
            </svg>
          </button>
        </div>

        {/* Day events */}
        <div className="space-y-2">
          {hours.map((hour, i) => {
            const hourEvents = getEventsForHour(hour);

            return (
              <div key={i} className="flex gap-2">
                <div className="w-20 text-xs text-stone-500 text-right pr-2 flex-shrink-0">
                  {hour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
                </div>
                <div className="flex-1 min-h-[60px] border-t border-stone-100 p-2">
                  {hourEvents.length > 0 ? (
                    <div className="space-y-1">
                      {hourEvents.map((event, j) => (
                        <div
                          key={j}
                          onClick={() => handleEventClick(event)}
                          className={`
                            text-sm px-3 py-2 rounded-lg cursor-pointer
                            ${
                              event.source === 'google'
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : event.source === 'outlook'
                                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                  : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                            }
                          `}
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs opacity-75">
                            {new Date(event.startDate).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                            {' - '}
                            {new Date(event.endDate).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => onCreateEvent?.(hour)}
                      className="w-full h-full flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                      aria-label="Create event"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-2H8m4 2h10m-10 0v4h14m-5 18v2H8m4 2h10m-10 0v4h14"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // View switcher
  const renderViewSwitcher = () => (
    <div className="flex items-center justify-center gap-1 p-2 bg-stone-50 border-t border-stone-200">
      {(['day', 'week', 'month'] as CalendarView[]).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => setCurrentView(v)}
          className={`
            px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
            ${
              currentView === v
                ? 'bg-stone-900 text-stone-50'
                : 'bg-white text-stone-600 hover:bg-stone-100'
            }
          `}
        >
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && renderWeekView()}
        {currentView === 'day' && renderDayView()}
        {renderViewSwitcher()}
      </div>

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div>
                <h2 className="font-serif text-xl font-medium text-stone-900">
                  {selectedEvent.title}
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {new Date(selectedEvent.startDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {' - '}
                  {new Date(selectedEvent.endDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={handleCloseEventDetails}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Transcription Section */}
              <CalendarEventTranscript
                eventId={selectedEvent.id}
                eventTitle={selectedEvent.title}
                eventDate={new Date(selectedEvent.startDate)}
                onTranscribe={handleTranscribe}
                onViewMeeting={handleViewMeeting}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CalendarView;
