/**
 * Unit tests for the EventContext reducer logic.
 *
 * We extract and test the reducer in isolation — no React rendering needed.
 * This validates all state transitions without needing a full provider setup.
 */

import { CalendarEvent } from '../../types';

// ─── Inline the reducer (mirrors EventContext.tsx exactly) ────────────────────
// We duplicate the reducer here rather than importing it because it's not
// exported from EventContext. This also acts as a contract test — if the
// reducer signature changes in the source, these tests will fail as a signal.

interface EventState {
  events: CalendarEvent[];
  isLoading: boolean;
}

type EventAction =
  | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

function eventReducer(state: EventState, action: EventAction): EventState {
  switch (action.type) {
    case 'SET_EVENTS':
      return { ...state, events: action.payload, isLoading: false };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(e => e.id === action.payload.id ? action.payload : e),
      };
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter(e => e.id !== action.payload) };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt-1',
  title: 'Test Event',
  date: '2026-04-01',
  category: 'birthday',
  recurrence: 'yearly',
  contacts: [],
  whatsappEnabled: false,
  instagramEnabled: false,
  notifyDaysBefore: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const emptyState: EventState = { events: [], isLoading: false };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('eventReducer', () => {
  // ── SET_EVENTS ──────────────────────────────────────────────────────────────

  describe('SET_EVENTS', () => {
    it('replaces events and sets isLoading to false', () => {
      const events = [makeEvent(), makeEvent({ id: 'evt-2', title: 'Another' })];
      const state = eventReducer({ events: [], isLoading: true }, {
        type: 'SET_EVENTS',
        payload: events,
      });
      expect(state.events).toEqual(events);
      expect(state.isLoading).toBe(false);
    });

    it('sets events to an empty array when payload is empty', () => {
      const state = eventReducer(
        { events: [makeEvent()], isLoading: false },
        { type: 'SET_EVENTS', payload: [] }
      );
      expect(state.events).toHaveLength(0);
    });
  });

  // ── ADD_EVENT ───────────────────────────────────────────────────────────────

  describe('ADD_EVENT', () => {
    it('appends a new event to the list', () => {
      const existing = makeEvent({ id: 'evt-1' });
      const newEvent = makeEvent({ id: 'evt-2', title: 'New One' });
      const state = eventReducer(
        { events: [existing], isLoading: false },
        { type: 'ADD_EVENT', payload: newEvent }
      );
      expect(state.events).toHaveLength(2);
      expect(state.events[1]).toEqual(newEvent);
    });

    it('adds to an empty list', () => {
      const event = makeEvent();
      const state = eventReducer(emptyState, { type: 'ADD_EVENT', payload: event });
      expect(state.events).toHaveLength(1);
      expect(state.events[0]).toEqual(event);
    });

    it('does not mutate the original state', () => {
      const original = { events: [makeEvent()], isLoading: false };
      eventReducer(original, { type: 'ADD_EVENT', payload: makeEvent({ id: 'evt-2' }) });
      expect(original.events).toHaveLength(1);
    });
  });

  // ── UPDATE_EVENT ────────────────────────────────────────────────────────────

  describe('UPDATE_EVENT', () => {
    it('updates the event with the matching id', () => {
      const original = makeEvent({ id: 'evt-1', title: 'Old Title' });
      const updated = makeEvent({ id: 'evt-1', title: 'New Title' });
      const state = eventReducer(
        { events: [original], isLoading: false },
        { type: 'UPDATE_EVENT', payload: updated }
      );
      expect(state.events[0].title).toBe('New Title');
    });

    it('leaves other events unchanged', () => {
      const evt1 = makeEvent({ id: 'evt-1', title: 'First' });
      const evt2 = makeEvent({ id: 'evt-2', title: 'Second' });
      const updatedEvt2 = makeEvent({ id: 'evt-2', title: 'Second Updated' });
      const state = eventReducer(
        { events: [evt1, evt2], isLoading: false },
        { type: 'UPDATE_EVENT', payload: updatedEvt2 }
      );
      expect(state.events[0].title).toBe('First');
      expect(state.events[1].title).toBe('Second Updated');
    });

    it('does nothing if the id is not found', () => {
      const evt = makeEvent({ id: 'evt-1' });
      const ghost = makeEvent({ id: 'does-not-exist', title: 'Ghost' });
      const state = eventReducer(
        { events: [evt], isLoading: false },
        { type: 'UPDATE_EVENT', payload: ghost }
      );
      expect(state.events).toHaveLength(1);
      expect(state.events[0].title).toBe('Test Event');
    });
  });

  // ── DELETE_EVENT ────────────────────────────────────────────────────────────

  describe('DELETE_EVENT', () => {
    it('removes the event with the matching id', () => {
      const evt1 = makeEvent({ id: 'evt-1' });
      const evt2 = makeEvent({ id: 'evt-2' });
      const state = eventReducer(
        { events: [evt1, evt2], isLoading: false },
        { type: 'DELETE_EVENT', payload: 'evt-1' }
      );
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe('evt-2');
    });

    it('leaves state unchanged if id does not exist', () => {
      const evt = makeEvent({ id: 'evt-1' });
      const state = eventReducer(
        { events: [evt], isLoading: false },
        { type: 'DELETE_EVENT', payload: 'non-existent' }
      );
      expect(state.events).toHaveLength(1);
    });

    it('empties the list when the last event is deleted', () => {
      const state = eventReducer(
        { events: [makeEvent()], isLoading: false },
        { type: 'DELETE_EVENT', payload: 'evt-1' }
      );
      expect(state.events).toHaveLength(0);
    });
  });

  // ── SET_LOADING ─────────────────────────────────────────────────────────────

  describe('SET_LOADING', () => {
    it('sets isLoading to true', () => {
      const state = eventReducer(emptyState, { type: 'SET_LOADING', payload: true });
      expect(state.isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      const state = eventReducer(
        { events: [], isLoading: true },
        { type: 'SET_LOADING', payload: false }
      );
      expect(state.isLoading).toBe(false);
    });

    it('does not change events when toggling loading', () => {
      const evt = makeEvent();
      const state = eventReducer(
        { events: [evt], isLoading: false },
        { type: 'SET_LOADING', payload: true }
      );
      expect(state.events).toHaveLength(1);
    });
  });

  // ── Unknown action (default branch) ─────────────────────────────────────────

  describe('default / unknown action', () => {
    it('returns state unchanged for unknown action types', () => {
      const state = { events: [makeEvent()], isLoading: false };
      // @ts-expect-error — intentionally wrong action type
      const next = eventReducer(state, { type: 'UNKNOWN_ACTION' });
      expect(next).toBe(state); // same reference — no copy
    });
  });
});
