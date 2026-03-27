/**
 * UI / component tests for CalendarScreen.
 *
 * Tests the calendar event list, date selection, and add/edit/delete actions.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CalendarEvent } from '../../types';

// ─── Mock navigation ──────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native-stack', () => ({}));
// navigation prop is injected directly into the component in tests below.

// ─── Mock react-native-calendars ──────────────────────────────────────────────
// Already handled globally in jest.setup.js

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
})();

const mockDeleteEvent = jest.fn();
const mockLoadEvents = jest.fn();

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt-1',
  title: 'Test Event',
  date: TODAY,
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

let mockEvents: CalendarEvent[] = [];

jest.mock('../../context/EventContext', () => ({
  useEvents: () => ({
    events: mockEvents,
    loadEvents: mockLoadEvents,
    deleteEvent: mockDeleteEvent,
  }),
}));

// ─── Import AFTER mocks are set up ────────────────────────────────────────────

import CalendarScreen from '../../screens/calendar/CalendarScreen';

const createNavigation = () => ({
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEvents = [];
  mockDeleteEvent.mockClear();
  mockLoadEvents.mockClear();
  mockNavigate.mockClear();
});

describe('CalendarScreen — rendering', () => {
  it('renders without crashing', () => {
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    // The "Add" button should always be present
    expect(getByText('+ Add')).toBeTruthy();
  });

  it('shows the empty state when no events on the selected date', () => {
    mockEvents = [];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText(/Tap.*Add.*to add/i)).toBeTruthy();
  });

  it('shows events for the currently selected date', () => {
    mockEvents = [
      makeEvent({ id: 'e1', title: 'Alice\'s Birthday', date: TODAY }),
    ];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText("Alice's Birthday")).toBeTruthy();
  });

  it('does NOT show events from other dates by default', () => {
    mockEvents = [
      makeEvent({ id: 'other', title: 'Other Day Event', date: TOMORROW }),
    ];
    const { queryByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    // The event for TOMORROW should not be visible (default selected is TODAY)
    expect(queryByText('Other Day Event')).toBeNull();
  });

  it('shows recurrence indicator on events', () => {
    mockEvents = [
      makeEvent({ id: 'e1', date: TODAY, recurrence: 'yearly' }),
    ];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText(/yearly/i)).toBeTruthy();
  });

  it('shows "one-time" label for non-recurring events', () => {
    mockEvents = [
      makeEvent({ id: 'e1', date: TODAY, recurrence: 'none' }),
    ];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText(/one-time/i)).toBeTruthy();
  });

  it('shows WhatsApp emoji for enabled events', () => {
    mockEvents = [
      makeEvent({ id: 'e1', date: TODAY, whatsappEnabled: true }),
    ];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText(/💬/)).toBeTruthy();
  });
});

describe('CalendarScreen — event count header', () => {
  it('shows "No events" message for an empty date', () => {
    mockEvents = [];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText(/No events on/i)).toBeTruthy();
  });

  it('shows singular "1 event" for one event', () => {
    mockEvents = [makeEvent({ id: 'e1', date: TODAY })];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText(/1 event on/i)).toBeTruthy();
  });

  it('shows plural "2 events" for two events', () => {
    mockEvents = [
      makeEvent({ id: 'e1', date: TODAY }),
      makeEvent({ id: 'e2', date: TODAY, title: 'Second Event' }),
    ];
    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );
    expect(getByText(/2 events on/i)).toBeTruthy();
  });
});

describe('CalendarScreen — navigation actions', () => {
  it('navigates to AddEvent screen when "Add" button is pressed', () => {
    const nav = createNavigation();
    const { getByText } = render(
      <CalendarScreen navigation={nav as any} />
    );
    fireEvent.press(getByText('+ Add'));
    expect(nav.navigate).toHaveBeenCalledWith('AddEvent', { date: TODAY });
  });

  it('navigates to EditEvent when the edit button is pressed', () => {
    mockEvents = [makeEvent({ id: 'edit-me', date: TODAY })];
    const nav = createNavigation();
    const { getByText } = render(
      <CalendarScreen navigation={nav as any} />
    );
    fireEvent.press(getByText('✏️'));
    expect(nav.navigate).toHaveBeenCalledWith('EditEvent', { eventId: 'edit-me' });
  });
});

describe('CalendarScreen — delete flow', () => {
  it('calls deleteEvent after the user confirms deletion', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        const del = buttons?.find((b: any) => b.style === 'destructive');
        del?.onPress?.();
      });

    mockEvents = [makeEvent({ id: 'bye', title: 'Bye Bye Event', date: TODAY })];

    const { getByText } = render(
      <CalendarScreen navigation={createNavigation() as any} />
    );

    fireEvent.press(getByText('🗑️'));

    await waitFor(() => {
      expect(mockDeleteEvent).toHaveBeenCalledWith('bye');
    });

    alertSpy.mockRestore();
  });
});

describe('CalendarScreen — lifecycle', () => {
  it('calls loadEvents on mount', () => {
    render(<CalendarScreen navigation={createNavigation() as any} />);
    expect(mockLoadEvents).toHaveBeenCalledTimes(1);
  });
});
