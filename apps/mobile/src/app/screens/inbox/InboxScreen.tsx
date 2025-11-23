import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { ActivityIndicator, List, Chip, Searchbar, SegmentedButtons } from 'react-native-paper';
import { fetchUnifiedInbox, InboxItem } from '../../lib/conversations.api';
import { EmptyState } from '../../components/ui/EmptyState';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export function InboxScreen({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList> }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'closed'>('all');
  const [channel, setChannel] = useState<'all' | 'whatsapp' | 'instagram' | 'email'>('all');

  const load = useCallback(async () => {
    const res = await fetchUnifiedInbox({ limit: 50, search: search || undefined, status: status === 'all' ? undefined : status, channel: channel === 'all' ? undefined : channel });
    setItems(res.conversations || []);
  }, [search, status, channel]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!items.length) {
    return <EmptyState title="No conversations" subtitle="Your inbox is clear" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 8 }}>
        <Searchbar placeholder="Search" value={search} onChangeText={setSearch} onSubmitEditing={load} />
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <SegmentedButtons
            density="small"
            value={status}
            onValueChange={(v) => setStatus(v as 'all' | 'active' | 'closed')}
            buttons={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }]}
          />
          <View style={{ width: 8 }} />
          <SegmentedButtons
            density="small"
            value={channel}
            onValueChange={(v) => setChannel(v as 'all' | 'whatsapp' | 'instagram' | 'email')}
            buttons={[{ value: 'all', label: 'All' }, { value: 'whatsapp', label: 'WA' }, { value: 'instagram', label: 'IG' }, { value: 'email', label: 'Email' }]}
          />
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <List.Item
            title={item.customer?.name || item.subject}
            description={item.lastMessage?.preview || item.subject}
            left={(props) => <List.Icon {...props} icon={item.channel?.type === 'whatsapp' ? 'whatsapp' : item.channel?.type === 'instagram' ? 'instagram' : 'email'} />}
            right={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.priority ? <Chip style={{ marginRight: 8 }}>{item.priority}</Chip> : null}
                {item.unreadCount ? <Chip>{item.unreadCount}</Chip> : null}
              </View>
            )}
            onPress={() => navigation.navigate('Conversation', { id: item.id })}
          />
        )}
      />
    </View>
  );
}


