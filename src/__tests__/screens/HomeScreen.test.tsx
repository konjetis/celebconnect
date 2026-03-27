/**
 * UI / component tests for HomeScreen.
 *
 * We wrap the component in mock providers so we can control exactly what
 * state is injected and verify the rendered output.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/home/HomeScreen';
import { CalendarEvent, User } from '../../types';

// ─── Mock contexts ────────────────────────────────────────────────────────────

const mockDeleteEvent = jest.fn();
const mockLoadEvents = jest.fn();

const mockUser: User = {
  id: 'u1',
  firstName: 'Suneetha',
  lastName: 'K',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// We use jest.mock at the module level so imports in HomeScreen are intercepted.

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt-1',
  title: 'Alice\'s Birthday',
  date: new Date().toISOString().split('T')[0], // today by default
  category: 'birthday',
  recurrence: 'yearly',
  contacts: [],
  whatsappEnabled: false,
  instagramEnabled: false,
  notifyDaysBefore: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// We build a configurable events mock factory
let mockEvents: CalendarEvent[] = [];
let mockUpcomingEvents: CalendarEvent[] = [];

jest.mock('../../context/EventContext', () => ({
  useEvents: () => ({
    loadEvents: mockLoadEvents,
    deleteEvent: mockDeleteEvent,
    getUpcomingEvents: jest.fn((days: number) => {
      if (days === 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        return mockUpcomingEvents.filter(e => e.date === todayStr);
      }
      return mockUpcomingEvents;
    }),
  }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEvents = [];
  mockUpcomingEvents = [];
  mockDeleteEvent.mockClear();
  mockLoadEvents.mockClear();
});

describe('HomeScreen — rendering', () => {
  it('renders a greeting with the user\'s first name', () => {
    const { getByText } = render(<HomeScreen />);
    // Greeting includes "Suneetha" somewhere on screen
    expect(getByText(/Suneetha/)).toBeTruthy();
  });

  it('shows the empty state message when there are no upcoming events', () => {
    mockUpcomingEvents = [];
    const { getByText } = render(<HomeScreen />);
    expect(getByText(/No upcoming events/i)).toBeTruthy();
  });

  it('shows the upcoming event count in the greeting subtitle', () => {
    mockUpcomingEvents = [
      makeEvent({ id: 'e1', date: '2026-04-01' }),
      makeEvent({ id: 'e2', date: '2026-04-10', category: 'anniversary' }),
    ];
    const { getByText } = render(<HomeScreen />);
    expect(getByText(/2 upcoming/i)).toBeTruthy();
  });

  it('renders upcoming events in the Next 30 Days section', () => {
    mockUpcomingEvents = [
      makeEvent({ id: 'e1', title: 'Mom\'s Birthday', date: '2026-04-05' }),
    ];
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Mom's Birthday")).toBeTruthy();
  });

  it('renders the Today section for events happening today', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    mockUpcomingEvents = [
      makeEvent({ id: 'today-evt', title: 'Today\'s Party', date: todayStr }),
    ];
    const { getAllByText } = render(<HomeScreen />);
    // "Today" appears in both section header and date labels — at least one match expected
    expect(getAllByText(/Today/i).length).toBeGreaterThanOrEqual(1);
    // Event appears in both "Today" and "Next 30 Days" sections
    expect(getAllByText("Today's Party").length).toBeGreaterThanOrEqual(1);
  });

  it('shows WhatsApp badge when whatsappEnabled is true', () => {
    mockUpcomingEvents = [
      makeEvent({ id: 'e1', date: '2026-04-01', whatsappEnabled: true }),
    ];
    const { getByText } = render(<HomeScreen />);
    expect(getByText(/WhatsApp/i)).toBeTruthy();
  });

  it('shows Instagram badge when instagramEnabled is true', () => {
    mockUpcomingEvents = [
      makeEvent({ id: 'e1', date: '2026-04-01', instagramEnabled: true }),
    ];
    const { getByText } = render(<HomeScreen />);
    expect(getByText(/Instagram/i)).toBeTruthy();
  });
});

describe('HomeScreen — stats cards', () => {
  it('shows correct birthday count in stats', () => {
    mockUpcomingEvents = [
      makeEvent({ id: 'b1', category: 'birthday', date: '2026-04-01' }),
      makeEvent({ id: 'b2', category: 'birthday', date: '2026-04-05' }),
      makeEvent({ id: 'a1', category: 'anniversary', date: '2026-04-10' }),
    ];
    const { getAllByText } = render(<HomeScreen />);
    // The stat card for Birthdays shows count "2"
    // There may be multiple Text nodes with "2" so we use getAllByText
    const twos = getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });
});

describe('HomeScreen — delete flow', () => {
  it('calls deleteEvent with the correct event id after confirmation', async () => {
    // We need to mock Alert.alert to simulate the user pressing "Delete"
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        // Auto-press the destructive "Delete" button
        const deleteBtn = buttons?.find((b: any) => b.style === 'destructive');
        deleteBtn?.onPress?.();
      });

    mockUpcomingEvents = [
      makeEvent({ id: 'del-evt', title: 'Delete Me', date: '2026-04-01' }),
    ];

    const { getByText } = render(<HomeScreen />);

    // Find and press the delete button (🗑️)
    const deleteButtons = getByText('🗑️');
    fireEvent.press(deleteButtons);

    await waitFor(() => {
      expect(mockDeleteEvent).toHaveBeenCalledWith('del-evt');
    });

    alertSpy.mockRestore();
  });

  it('does NOT call deleteEvent when the user presses Cancel', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        // Press the Cancel button instead
        const cancelBtn = buttons?.find((b: any) => b.style === 'cancel');
        cancelBtn?.onPress?.();
      });

    mockUpcomingEvents = [
      makeEvent({ id: 'keep-evt', title: 'Keep Me', date: '2026-04-01' }),
    ];

    const { getByText } = render(<HomeScreen />);
    fireEvent.press(getByText('🗑️'));

    await waitFor(() => {
      expect(mockDeleteEvent).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });
});

describe('HomeScreen — lifecycle', () => {
  it('calls loadEvents on mount', () => {
    render(<HomeScreen />);
    expect(mockLoadEvents).toHaveBeenCalledTimes(1);
  });
});
