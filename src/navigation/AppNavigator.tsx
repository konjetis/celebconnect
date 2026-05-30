import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, StyleSheet, Alert } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { registerResetPasswordNavigator, registerInstagramCallbackHandler } from './navRegistry';
import { RootStackParamList, AuthStackParamList, MainTabParamList, CalendarStackParamList } from '../types';
import { COLORS } from '../utils/theme';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import HomeScreen from '../screens/home/HomeScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import AddEditEventScreen from '../screens/calendar/AddEditEventScreen';
import AccountScreen from '../screens/account/AccountScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();

// ─── Auth Stack ───────────────────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Calendar Stack ───────────────────────────────────────────────────────────

function CalendarNavigator() {
  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <CalendarStack.Screen name="CalendarMain" component={CalendarScreen} options={{ title: 'My Calendar' }} />
      <CalendarStack.Screen name="AddEvent" component={AddEditEventScreen} options={{ title: 'Add Event' }} />
      <CalendarStack.Screen name="EditEvent" component={AddEditEventScreen} options={{ title: 'Edit Event' }} />
    </CalendarStack.Navigator>
  );
}

// ─── Main Tab Navigator ───────────────────────────────────────────────────────

function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Home: focused ? '🏠' : '🏡',
            Calendar: focused ? '📅' : '🗓️',
            Account: focused ? '👤' : '👥',
          };
          return <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 4,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
      })}
    >
      <MainTab.Screen name="Home" component={HomeScreen} options={{ title: '🎉 CelebConnect' }} />
      <MainTab.Screen name="Calendar" component={CalendarNavigator} options={{ headerShown: false }} />
      <MainTab.Screen name="Account" component={AccountScreen} options={{ title: 'My Account' }} />
    </MainTab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  // Register deep-link callback for password-reset flow.
  // Works even if the app is cold-started from the link — the handler
  // queues the navigation until the container is ready.
  useEffect(() => {
    registerResetPasswordNavigator((token: string) => {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(CommonActions.navigate('ResetPassword', { token }));
      }
    });

    registerInstagramCallbackHandler(async (token: string) => {
      try {
        await loginWithInstagram(token);
      } catch {
        Alert.alert('Instagram Login Failed', 'Could not complete sign-in. Please try again.');
      }
    });
  }, [loginWithInstagram]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>🎉</Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingLogo: { fontSize: 72 },
});
