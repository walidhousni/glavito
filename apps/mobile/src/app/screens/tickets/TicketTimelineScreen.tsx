import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Appbar, List, Text } from 'react-native-paper';
import { createApiClient } from '../../lib/api';

export function TicketTimelineScreen({ route, navigation }: { route: { params: { id: string } }; navigation: any }) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    const api = createApiClient();
    const res = await api.get(`/tickets/${id}/timeline`);
    setItems(res.data || []);
  }, [id]);

  useEffect(() => {
    let m = true;
    (async () => { try { await load(); } finally { if (m) setLoading(false); } })();
    return () => { m = false };
  }, [load]);

  if (loading) {
    return (<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>);
  }

  return (
    <View style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Timeline" />
      </Appbar.Header>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.eventType?.replace(/_/g, ' ') || 'Event'}
            description={item.description}
            left={(props) => <List.Icon {...props} icon="timeline" />}
            right={() => <Text style={{ opacity: 0.6 }}>{new Date(item.createdAt).toLocaleString()}</Text>}
          />
        )}
      />
    </View>
  );
}


