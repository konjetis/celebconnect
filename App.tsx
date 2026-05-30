import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestNotificationPermissions } from './src/utils/notifications';
import { navigateToHome, navigateToResetPassword, handleInstagramCallback } from './src/navigation/navRegistry';

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
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Handle deep links (e.g. celebconnect://reset-password?token=...)
    const handleDeepLink = ({ url }: { url: string }) => {
      handleUrl(url);
    };
    // App already open — listen for incoming links
    const linkSub = Linking.addEventListener('url', handleDeepLink);
    // App cold-started from a link
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); }).catch(() => {});

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
        const data = response.notification.request.content.data as Record<string, string> | undefined;
        const waPhone = data?.waPhone;
        const message = data?.message;

        if (waPhone && message) {
          // Open WhatsApp with the contact's number and message pre-filled.
          // The user taps Send once — the message comes from their personal number.
          const encodedMessage = encodeURIComponent(message);
          const cleanPhone     = waPhone.replace(/\D/g, '');
          const url            = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
          Linking.canOpenURL(url)
            .then(supported => {
              if (supported) return Linking.openURL(url);
              // WhatsApp not installed — fall back to web.whatsapp.com
              return Linking.openURL(
                `https://wa.me/${cleanPhone}?text=${encodedMessage}`
              );
            })
            .catch(err => console.error('Failed to open WhatsApp:', err));
        } else if (data?.eventId) {
          // Notification without WhatsApp data — just navigate to Home
          navigateToHome();
        }
      }
    );

    return () => {
      linkSub.remove();
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

// ─── Deep link handler ────────────────────────────────────────────────────────

function handleUrl(url: string) {
  try {
    const parsed = new URL(url);
    switch (parsed.hostname) {
      case 'reset-password': {
        const token = parsed.searchParams.get('token');
        if (token) navigateToResetPassword(token);
        break;
      }
      case 'instagram-callback': {
        const token = parsed.searchParams.get('token');
        const error = parsed.searchParams.get('error');
        if (token) handleInstagramCallback(token);
        else if (error) console.warn('[DeepLink] Instagram login error:', error);
        break;
      }
    }
  } catch {
    // ignore malformed URLs
  }
}
