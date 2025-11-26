import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { LoginScreen } from '../auth/screens/LoginScreen';
import { Text, View, ActivityIndicator } from 'react-native';
import { RootState } from '../store';
import * as SecureStore from 'expo-secure-store';
// import { setCredentials } from '../auth/auth.slice'; // TODO: Implement auto-login check

const Stack = createNativeStackNavigator();

const DashboardScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Dashboard (Protected)</Text>
  </View>
);

export const RootNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isReady, setIsReady] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      // TODO: Check for stored token and validate
      // const token = await SecureStore.getItemAsync('accessToken');
      // if (token) { ... }
      setIsReady(true);
    };
    checkAuth();
  }, [dispatch]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
