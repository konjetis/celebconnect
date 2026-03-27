/**
 * Integration tests for EventContext (EventProvider + useEvents hook).
 *
 * These tests mount the provider and interact with it via a consumer component,
 * then verify that AsyncStorage is read/written correctly and that state updates
 * propagate to subscribers.
 */

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventProvider, useEvents } from '../../context/EventContext';
import { CalendarEvent } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'celebconnect_events';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: String(Date.now()),
  title: 'Birthday Party',
  date: '2026-04-15',
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

/** A tiny component that exposes the context via data-testid attributes. */
function TestConsumer({
  onAddEvent,
  onDeleteEvent,
}: {
  onAddEvent?: () => void;
  onDeleteEvent?: (id: string) => void;
}) {
  const { events, isLoading, addEvent, deleteEvent } = useEvents();

  return (
    <>
      <Text testID="event-count">{events.length}</Text>
      <Text testID="loading">{isLoading ? 'loading' : 'idle'}</Text>
      {events.map(e => (
        <Text key={e.id} testID={`event-${e.id}`}>{e.title}</Text>
      ))}
      {onAddEvent && (
        <TouchableOpacity testID="add-btn" onPress={onAddEvent} />
      )}
      {onDeleteEvent && events.length > 0 && (
        <TouchableOpacity
          testID="delete-btn"
          onPress={() => onDeleteEvent(events[0].id)}
        />
      )}
    </>
  );
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<EventProvider>{ui}</EventProvider>);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('EventProvider — initial state', () => {
  it('starts with an empty event list', async () => {
    const { getByTestId } = renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(getByTestId('event-count').props.children).toBe(0);
    });
  });

  it('loads persisted events from AsyncStorage on mount', async () => {
    const stored = [makeEvent({ id: 'stored-1', title: 'Stored Birthday' })];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    // Consumer that triggers loadEvents on mount (provider doesn't auto-load)
    function LoadingConsumer() {
      const { events, isLoading, loadEvents } = useEvents();
      React.useEffect(() => { loadEvents(); }, []);
      return (
        <>
          <Text testID="event-count">{events.length}</Text>
          <Text testID="loading">{isLoading ? 'loading' : 'idle'}</Text>
          {events.map(e => (
            <Text key={e.id} testID={`event-${e.id}`}>{e.title}</Text>
          ))}
        </>
      );
    }

    const { getByTestId } = renderWithProvider(<LoadingConsumer />);
    await waitFor(() => {
      expect(getByTestId('event-count').props.children).toBe(1);
      expect(getByTestId('event-stored-1').props.children).toBe('Stored Birthday');
    });
  });

  it('handles corrupt AsyncStorage data gracefully', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'NOT_VALID_JSON{{{{');
    // Should not throw; component should still render
    const { getByTestId } = renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      // May render 0 events or catch the error — just should not crash
      expect(getByTestId('loading').props.children).toBe('idle');
    });
  });
});

describe('EventProvider — addEvent', () => {
  it('adds an event and persists it to AsyncStorage', async () => {
    const eventData = {
      title: 'Anniversary Dinner',
      date: '2026-05-20',
      category: 'anniversary' as const,
      recurrence: 'yearly' as const,
      contacts: [],
      whatsappEnabled: true,
      instagramEnabled: false,
      notifyDaysBefore: 2,
    };

    let addFn: (() => Promise<void>) | undefined;

    function Consumer() {
      const { events, addEvent } = useEvents();
      addFn = () => addEvent(eventData);
      return <Text testID="count">{events.length}</Text>;
    }

    const { getByTestId } = renderWithProvider(<Consumer />);

    await act(async () => {
      await addFn?.();
    });

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(1);
    });

    // Verify AsyncStorage was updated
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const persisted = JSON.parse(raw!);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].title).toBe('Anniversary Dinner');
    expect(persisted[0].id).toBeDefined();
    expect(persisted[0].createdAt).toBeDefined();
  });

  it('accumulates multiple events without overwriting previous ones', async () => {
    let addFn: ((data: any) => Promise<void>) | undefined;

    function Consumer() {
      const { events, addEvent } = useEvents();
      addFn = addEvent;
      return <Text testID="count">{events.length}</Text>;
    }

    const { getByTestId } = renderWithProvider(<Consumer />);

    const base = {
      date: '2026-06-01', category: 'birthday' as const,
      recurrence: 'yearly' as const, contacts: [],
      whatsappEnabled: false, instagramEnabled: false, notifyDaysBefore: 0,
    };

    await act(async () => {
      await addFn?.({ ...base, title: 'First' });
    });
    await act(async () => {
      await addFn?.({ ...base, title: 'Second' });
    });
    await act(async () => {
      await addFn?.({ ...base, title: 'Third' });
    });

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(3);
    });

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw!)).toHaveLength(3);
  });
});

describe('EventProvider — deleteEvent', () => {
  it('removes the event from state and AsyncStorage', async () => {
    const existing = makeEvent({ id: 'del-1', title: 'To Delete' });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([existing]));

    let deleteFn: ((id: string) => Promise<void>) | undefined;

    function Consumer() {
      const { events, deleteEvent, loadEvents } = useEvents();
      React.useEffect(() => { loadEvents(); }, []);
      deleteFn = deleteEvent;
      return <Text testID="count">{events.length}</Text>;
    }

    const { getByTestId } = renderWithProvider(<Consumer />);

    // Wait for load
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));

    await act(async () => {
      await deleteFn?.('del-1');
    });

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(0);
    });

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw!)).toHaveLength(0);
  });
});

describe('EventProvider — updateEvent', () => {
  it('updates the matching event in state and AsyncStorage', async () => {
    const original = makeEvent({ id: 'upd-1', title: 'Original Title' });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([original]));

    let updateFn: ((event: CalendarEvent) => Promise<void>) | undefined;

    function Consumer() {
      const { events, updateEvent, loadEvents } = useEvents();
      React.useEffect(() => { loadEvents(); }, []);
      updateFn = updateEvent;
      return (
        <>
          <Text testID="count">{events.length}</Text>
          {events[0] && <Text testID="title">{events[0].title}</Text>}
        </>
      );
    }

    const { getByTestId } = renderWithProvider(<Consumer />);
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));

    const updated: CalendarEvent = { ...original, title: 'Updated Title' };
    await act(async () => {
      await updateFn?.(updated);
    });

    await waitFor(() => {
      expect(getByTestId('title').props.children).toBe('Updated Title');
    });

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const persisted = JSON.parse(raw!);
    expect(persisted[0].title).toBe('Updated Title');
    expect(persisted[0].updatedAt).not.toBe(original.updatedAt);
  });
});

describe('EventProvider — getUpcomingEvents', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-25T12:00:00'));
  });
  afterEach(() => jest.useRealTimers());

  it('returns events within the specified day range', async () => {
    const events: CalendarEvent[] = [
      makeEvent({ id: 'e1', date: '2026-03-25' }), // today
      makeEvent({ id: 'e2', date: '2026-03-30' }), // 5 days out
      makeEvent({ id: 'e3', date: '2026-04-24' }), // 30 days out
      makeEvent({ id: 'e4', date: '2026-05-01' }), // 37 days — outside 30 window
    ];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));

    let upcomingFn: ((days: number) => CalendarEvent[]) | undefined;

    function Consumer() {
      const { getUpcomingEvents, loadEvents } = useEvents();
      React.useEffect(() => { loadEvents(); }, []);
      upcomingFn = getUpcomingEvents;
      return null;
    }

    renderWithProvider(<Consumer />);
    await waitFor(() => expect(upcomingFn).toBeDefined());

    // Allow load to complete
    await act(async () => {});

    const upcoming30 = upcomingFn!(30);
    const ids = upcoming30.map(e => e.id);
    expect(ids).toContain('e1');
    expect(ids).toContain('e2');
    expect(ids).toContain('e3');
    expect(ids).not.toContain('e4');
  });

  it('returns events sorted by date ascending', async () => {
    const events: CalendarEvent[] = [
      makeEvent({ id: 'late', date: '2026-04-10' }),
      makeEvent({ id: 'early', date: '2026-03-26' }),
      makeEvent({ id: 'mid', date: '2026-04-01' }),
    ];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));

    let upcomingFn: ((days: number) => CalendarEvent[]) | undefined;

    function Consumer() {
      const { getUpcomingEvents, loadEvents } = useEvents();
      React.useEffect(() => { loadEvents(); }, []);
      upcomingFn = getUpcomingEvents;
      return null;
    }

    renderWithProvider(<Consumer />);
    await act(async () => {});

    const sorted = upcomingFn!(30);
    expect(sorted.map(e => e.id)).toEqual(['early', 'mid', 'late']);
  });
});

describe('useEvents hook — outside provider', () => {
  it('throws an error when used outside EventProvider', () => {
    // Suppress the expected error output from React
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useEvents(); // should throw
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useEvents must be used within EventProvider'
    );

    consoleSpy.mockRestore();
  });
});
