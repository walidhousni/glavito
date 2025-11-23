import React, { useEffect } from 'react';
import { Provider as PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext';
import { AppNavigator } from './navigation/AppNavigator';
import { Linking, Platform } from 'react-native';
import { useAuthStore } from './store/auth.store';

export const Root: React.FC = () => {
  useEffect(() => {
    // Ensure Linking is configured with our prefixes for deep/universal links
    const sub = Linking.addEventListener('url', async (event: { url: string }) => {
      const url = event.url;
      // Attempt to capture auth tokens from SSO redirect
      await useAuthStore.getState().handleAuthDeepLink(url);
    });
    return () => {
      sub.remove();
    };
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={DefaultTheme}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default Root;


