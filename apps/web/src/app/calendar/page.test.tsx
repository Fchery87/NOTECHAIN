import { beforeEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const calendarPageMocks = vi.hoisted(() => ({
  getRouteState: vi.fn(),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({
    children,
    pageTitle,
    actions,
  }: {
    children: React.ReactNode;
    pageTitle: string;
    actions?: React.ReactNode;
  }) => (
    <main>
      <h1>{pageTitle}</h1>
      {actions}
      {children}
    </main>
  ),
}));

vi.mock('@/components/PrototypeNotice', () => ({
  PrototypeNotice: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock('@/components/CalendarView', () => ({
  CalendarView: ({
    events,
    onCreateEvent,
  }: {
    events: Array<{ title: string }>;
    onCreateEvent: (date: Date) => void;
  }) => (
    <div>
      <button onClick={() => onCreateEvent(new Date('2026-06-26T09:00:00.000Z'))}>
        Trigger Create
      </button>
      {events.map(event => (
        <div key={event.title}>{event.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/lib/calendar/calendarAccess', () => ({
  createCalendarAccess: () => ({
    getRouteState: calendarPageMocks.getRouteState,
  }),
}));

import CalendarPage from './page';

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calendarPageMocks.getRouteState.mockResolvedValue({
      events: [
        {
          id: 'event-1',
          title: 'Team Standup',
          startDate: new Date('2026-06-26T09:00:00.000Z'),
          endDate: new Date('2026-06-26T10:00:00.000Z'),
          source: 'google',
        },
      ],
      accounts: [
        {
          provider: 'google',
          label: 'Google Calendar',
          localEventCount: 1,
          statusLabel: 'Local prototype',
          connection: 'prototype',
        },
      ],
    });
  });

  test('loads route state from the calendar access seam', async () => {
    render(<CalendarPage />);

    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Calendar integration prototype')).toBeInTheDocument();

    await waitFor(() => {
      expect(calendarPageMocks.getRouteState).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText('Team Standup')).toHaveLength(2);
      expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    });
  });

  test('keeps prototype messaging honest about seeded local event shells', async () => {
    render(<CalendarPage />);

    expect(
      screen.getByText(
        /Seeded prototype data may still appear here until provider sync and lifecycle flows are real/i
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(calendarPageMocks.getRouteState).toHaveBeenCalledTimes(1);
    });
  });

  test('renders the new event action without requiring provider composition in the route', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      render(<CalendarPage />);
      fireEvent.click(screen.getByText('New Event'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Create event at:', expect.any(Date));
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
