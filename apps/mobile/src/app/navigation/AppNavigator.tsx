import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SignInScreen, RegisterScreen, ForgotPasswordScreen, VerifyEmailScreen, ResetPasswordScreen, AcceptInvitationScreen } from '../screens/auth';
import { HomeScreen } from '../screens/home/HomeScreen';
import { AdminDashboard } from '../screens/dashboard/AdminDashboard';
import { AgentDashboard } from '../screens/dashboard/AgentDashboard';
import { InboxScreen } from '../screens/inbox/InboxScreen';
import { ConversationScreen } from '../screens/conversation/ConversationScreen';
import { TicketDetailScreen } from '../screens/tickets/TicketDetailScreen';
import { TicketTimelineScreen } from '../screens/tickets/TicketTimelineScreen';
import { TicketsListScreen } from '../screens/tickets/TicketsListScreen';
import { TicketCreateScreen } from '../screens/tickets/TicketCreateScreen';

export type RootStackParamList = {
  SignIn: undefined;
  Register: undefined;
  Forgot: undefined;
  VerifyEmail: { token?: string } | undefined;
  ResetPassword: { token?: string } | undefined;
  AcceptInvitation: { token?: string } | undefined;
  MainTabs: undefined;
  Conversation: { id: string };
  Ticket: { id: string };
  TicketTimeline: { id: string };
  TicketCreate: undefined;
};

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['glavito://', 'https://app.glavito.com'],
  config: {
    screens: {
      SignIn: 'signin',
      Register: 'register',
      Forgot: 'forgot',
      VerifyEmail: 'verify-email',
      ResetPassword: 'reset-password',
      AcceptInvitation: 'invite/accept',
      MainTabs: 'app',
      Conversation: 'conversation/:id',
      Ticket: 'ticket/:id',
      TicketTimeline: 'ticket/:id/timeline',
      TicketCreate: 'ticket/create',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';
  return (
    <Tabs.Navigator
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        headerShown: false,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          const name: keyof typeof MaterialCommunityIcons.glyphMap = route.name === 'Inbox'
            ? 'inbox'
            : route.name === 'Agent'
            ? 'account'
            : route.name === 'Admin'
            ? 'shield-account'
            : 'home';
          return <MaterialCommunityIcons name={name} color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="Inbox" component={InboxScreen} />
      <Tabs.Screen name="Tickets" component={TicketsListScreen} />
      <Tabs.Screen name="Agent" component={AgentDashboard} />
      {isAdmin ? <Tabs.Screen name="Admin" component={AdminDashboard} /> : null}
      <Tabs.Screen name="Home" component={HomeScreen} />
    </Tabs.Navigator>
  );
}

export const AppNavigator = () => {
  const scheme = useColorScheme();
  const auth = useAuth();
  const isAuthenticated = Boolean(auth.user && auth.accessToken);

  return (
    <NavigationContainer linking={linking} theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Forgot" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="AcceptInvitation" component={AcceptInvitationScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="Ticket" component={TicketDetailScreen} />
            <Stack.Screen name="TicketTimeline" component={TicketTimelineScreen} />
            <Stack.Screen name={"TicketCreate" as unknown as keyof RootStackParamList} component={TicketCreateScreen as React.ComponentType<object>} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};


