/**
 * Unit tests for the AuthContext reducer logic.
 *
 * We test the reducer in isolation to verify all state transitions.
 */

import { AuthState, User } from '../../types';

// ─── Inline reducer (mirrors AuthContext.tsx) ─────────────────────────────────

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 'user-1',
  firstName: 'Suneetha',
  lastName: 'K',
  email: 'suneetha@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const loggedInState: AuthState = {
  user: mockUser,
  token: 'mock_token_123',
  isAuthenticated: true,
  isLoading: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authReducer', () => {
  // ── Initial state ────────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has the correct default values', () => {
      expect(initialState.user).toBeNull();
      expect(initialState.token).toBeNull();
      expect(initialState.isLoading).toBe(true); // starts loading while restoring session
      expect(initialState.isAuthenticated).toBe(false);
    });
  });

  // ── SET_LOADING ──────────────────────────────────────────────────────────────

  describe('SET_LOADING', () => {
    it('sets isLoading to true', () => {
      const state = authReducer(
        { ...initialState, isLoading: false },
        { type: 'SET_LOADING', payload: true }
      );
      expect(state.isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      const state = authReducer(initialState, { type: 'SET_LOADING', payload: false });
      expect(state.isLoading).toBe(false);
    });

    it('does not change other fields', () => {
      const state = authReducer(loggedInState, { type: 'SET_LOADING', payload: true });
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('mock_token_123');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  // ── LOGIN_SUCCESS ────────────────────────────────────────────────────────────

  describe('LOGIN_SUCCESS', () => {
    it('sets user, token, isAuthenticated=true, and isLoading=false', () => {
      const state = authReducer(initialState, {
        type: 'LOGIN_SUCCESS',
        payload: { user: mockUser, token: 'new_token' },
      });
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('new_token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('overwrites an existing session with a new one', () => {
      const newUser: User = { ...mockUser, id: 'user-2', firstName: 'Other' };
      const state = authReducer(loggedInState, {
        type: 'LOGIN_SUCCESS',
        payload: { user: newUser, token: 'token_999' },
      });
      expect(state.user?.id).toBe('user-2');
      expect(state.token).toBe('token_999');
    });

    it('forces isLoading to false even if it was true', () => {
      const state = authReducer(
        { ...initialState, isLoading: true },
        { type: 'LOGIN_SUCCESS', payload: { user: mockUser, token: 't' } }
      );
      expect(state.isLoading).toBe(false);
    });
  });

  // ── LOGOUT ───────────────────────────────────────────────────────────────────

  describe('LOGOUT', () => {
    it('clears user, token, and isAuthenticated', () => {
      const state = authReducer(loggedInState, { type: 'LOGOUT' });
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('sets isLoading to false after logout', () => {
      const state = authReducer(loggedInState, { type: 'LOGOUT' });
      expect(state.isLoading).toBe(false);
    });

    it('is idempotent — logging out when already logged out is safe', () => {
      const alreadyLoggedOut: AuthState = { ...initialState, isLoading: false };
      const state = authReducer(alreadyLoggedOut, { type: 'LOGOUT' });
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ── UPDATE_USER ──────────────────────────────────────────────────────────────

  describe('UPDATE_USER', () => {
    it('updates the user object without changing other fields', () => {
      const updatedUser: User = { ...mockUser, firstName: 'Updated Name' };
      const state = authReducer(loggedInState, {
        type: 'UPDATE_USER',
        payload: updatedUser,
      });
      expect(state.user?.firstName).toBe('Updated Name');
      expect(state.token).toBe('mock_token_123');
      expect(state.isAuthenticated).toBe(true);
    });

    it('can update user profile photo', () => {
      const updatedUser: User = { ...mockUser, profilePhoto: 'https://example.com/photo.jpg' };
      const state = authReducer(loggedInState, {
        type: 'UPDATE_USER',
        payload: updatedUser,
      });
      expect(state.user?.profilePhoto).toBe('https://example.com/photo.jpg');
    });
  });

  // ── Unknown action ───────────────────────────────────────────────────────────

  describe('default / unknown action', () => {
    it('returns state unchanged', () => {
      // @ts-expect-error — intentionally passing invalid action
      const state = authReducer(loggedInState, { type: 'UNKNOWN' });
      expect(state).toBe(loggedInState);
    });
  });
});
