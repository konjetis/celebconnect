import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { AuthState, User, LoginCredentials, RegisterCredentials } from '../types';
import * as authService from '../services/authService';

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
    case 'SET_LOADING':   return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS': return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':        return { ...initialState, isLoading: false };
    case 'UPDATE_USER':   return { ...state, user: action.payload };
    default:              return state;
  }
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithInstagram: (token: string, userId: string) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (identifier: string) => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Push token registration ──────────────────────────────────────────────────

async function registerPushToken(token: string): Promise<void> {
  try {
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync();
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (!backendUrl || !tokenData) return;
    await fetch(`${backendUrl}/api/auth/push-token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ token: tokenData }),
    });
  } catch {
    // Non-fatal — push notifications just won't work if this fails
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => { restoreSession(); }, []);

  const restoreSession = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userJson = await SecureStore.getItemAsync('user_data');
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        try {
          const freshUser = await authService.validateToken(token);
          await SecureStore.setItemAsync('user_data', JSON.stringify(freshUser));
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user: freshUser, token } });
        } catch {
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        }
        registerPushToken(token);
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, token } = await authService.login(credentials);
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
      registerPushToken(token);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const loginWithInstagram = async (instagramToken: string, instagramUserId: string) => {
    const user: User = {
      id: instagramUserId,
      firstName: 'Instagram',
      lastName: 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await SecureStore.setItemAsync('auth_token', instagramToken);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: instagramToken } });
  };

  const register = async (credentials: RegisterCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, token } = await authService.register(credentials);
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
      registerPushToken(token);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
    dispatch({ type: 'LOGOUT' });
  };

  const forgotPassword = async (identifier: string) => {
    await authService.forgotPassword(identifier);
  };

  const updateUser = (user: User) => {
    SecureStore.setItemAsync('user_data', JSON.stringify(user));
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithInstagram, register, logout, forgotPassword, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
