import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestNotificationPermissions } from './src/utils/notifications';

// ─── Error monitoring (Sentry) ────────────────────────────────────────────────
// To enable:
//   1. Run: npx expo install @sentry/react-native
//   2. Replace YOUR_SENTRY_DSN below with your DSN from sentry.io
//   3. Uncomment the three Sentry lines below
//
// import * as Sentry from '@sentry/react-native';
// Sentry.init({ dsn: 'YOUR_SENTRY_DSN', tracesSampleRate: 0.2 });
// export default Sentry.wrap(App);

export default function App() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Ask for notification permission on first launch
    requestNotificationPermissions().catch(() => {});

    // Fires when a notification arrives while the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification.request.content.title);
      }
    );

    // Fires when the user TAPS a notification (foreground or background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const eventId = response.notification.request.content.data?.eventId as string | undefined;
        if (eventId) {
          // Navigate to Home tab — the event will be visible in "Today" or "Upcoming"
          // The navigator ref is set up in AppNavigator; we use the global navigate helper
          navigateToHome();
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <EventProvider>
            <AppNavigator />
          </EventProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ─── Navigation helper ────────────────────────────────────────────────────────
// AppNavigator exposes a navigationRef so we can navigate from outside React tree

let _navigateToHome: (() => void) | null = null;

export function registerHomeNavigator(fn: () => void) {
  _navigateToHome = fn;
}

function navigateToHome() {
  _navigateToHome?.();
}
