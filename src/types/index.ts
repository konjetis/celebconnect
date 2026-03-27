// ─── User & Auth Types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type LoginMethod = 'email' | 'phone';

export interface LoginCredentials {
  identifier: string; // email or phone
  password: string;
  method: LoginMethod;
}

export interface RegisterCredentials {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  method: LoginMethod;
}

// ─── Calendar & Event Types ───────────────────────────────────────────────────

export type EventCategory = 'birthday' | 'anniversary' | 'holiday' | 'custom';

export type RecurrenceType = 'none' | 'yearly' | 'monthly' | 'weekly';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  category: EventCategory;
  recurrence: RecurrenceType;
  description?: string;
  contacts: EventContact[];
  whatsappEnabled: boolean;
  instagramEnabled: boolean;
  whatsappMessage?: string;
  instagramCaption?: string;
  notifyDaysBefore: number; // 0 = day of, 1 = day before, etc.
  createdAt: string;
  updatedAt: string;
}

export interface EventContact {
  id: string;
  name: string;
  phone?: string;
  instagramHandle?: string;
  isWhatsAppGroup?: boolean;
  groupId?: string;
}

// ─── Navigation Types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Account: undefined;
};

export type CalendarStackParamList = {
  CalendarMain: undefined;
  AddEvent: { date?: string };
  EditEvent: { eventId: string };
  EventDetail: { eventId: string };
};
