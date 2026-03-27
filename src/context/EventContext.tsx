import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEvent } from '../types';
import { scheduleEventNotification, cancelEventNotification } from '../utils/notifications';
import { syncEventToBackend, deleteEventFromBackend } from '../services/backendSync';

// ─── State ────────────────────────────────────────────────────────────────────

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

const initialState: EventState = { events: [], isLoading: false };

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

// ─── Context ──────────────────────────────────────────────────────────────────

interface EventContextType extends EventState {
  loadEvents: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByDate: (date: string) => CalendarEvent[];
  getUpcomingEvents: (days: number) => CalendarEvent[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

const STORAGE_KEY = 'celebconnect_events';

export function EventProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(eventReducer, initialState);

  const loadEvents = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const events: CalendarEvent[] = stored ? JSON.parse(stored) : [];
      dispatch({ type: 'SET_EVENTS', payload: events });
    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Always read from AsyncStorage to avoid stale closure bugs
  const readEvents = async (): Promise<CalendarEvent[]> => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  };

  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const current = await readEvents();
    const updated = [...current, newEvent];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    dispatch({ type: 'SET_EVENTS', payload: updated });
    // Schedule local notification + sync to backend (both fire-and-forget)
    scheduleEventNotification(newEvent).catch(() => {});
    syncEventToBackend(newEvent).catch(() => {});
  };

  const updateEvent = async (event: CalendarEvent) => {
    const updated = { ...event, updatedAt: new Date().toISOString() };
    const current = await readEvents();
    const newList = current.map(e => e.id === updated.id ? updated : e);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    dispatch({ type: 'SET_EVENTS', payload: newList });
    // Re-schedule notification with new details + sync to backend
    scheduleEventNotification(updated).catch(() => {});
    syncEventToBackend(updated).catch(() => {});
  };

  const deleteEvent = async (id: string) => {
    const current = await readEvents();
    const newList = current.filter(e => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    dispatch({ type: 'SET_EVENTS', payload: newList });
    // Cancel notification + remove from backend
    cancelEventNotification(id).catch(() => {});
    deleteEventFromBackend(id).catch(() => {});
  };

  const getEventsByDate = (date: string) =>
    state.events.filter(e => e.date === date);

  const getUpcomingEvents = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Strip time — compare dates only, not times
    const limit = new Date(today);
    limit.setDate(today.getDate() + days);
    limit.setHours(23, 59, 59, 999); // Include the full last day
    return state.events
      .filter(e => {
        const eventDate = new Date(e.date + 'T00:00:00'); // Parse as local midnight, not UTC
        return eventDate >= today && eventDate <= limit;
      })
      .sort((a, b) => new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime());
  };

  return (
    <EventContext.Provider
      value={{ ...state, loadEvents, addEvent, updateEvent, deleteEvent, getEventsByDate, getUpcomingEvents }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvents(): EventContextType {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvents must be used within EventProvider');
  return context;
}
