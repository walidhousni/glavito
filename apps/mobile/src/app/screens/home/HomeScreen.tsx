import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { onTicketEvents } from '../../lib/realtime';

export const HomeScreen: React.FC = () => {
  const auth = useAuth();
  useEffect(() => {
    const promise = onTicketEvents({
      created: () => {},
      updated: () => {},
      assigned: () => {},
      resolved: () => {},
    });
    let unsub: (() => void) | undefined;
    promise.then((u) => { unsub = u; }).catch(() => {});
    return () => { try { unsub?.(); } catch { /* noop */ } };
  }, []);
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text variant="headlineMedium" style={{ marginBottom: 12 }}>
        Hello {auth.user?.firstName || auth.user?.email}
      </Text>
      <Text variant="bodyMedium" style={{ marginBottom: 24 }}>
        Tenant: {auth.tenant?.name || auth.tenant?.id}
      </Text>
      <Button mode="outlined" onPress={() => auth.logout()}>Logout</Button>
    </View>
  );
};


