import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { TextInput, SegmentedButtons, Chip, List, ActivityIndicator, FAB } from 'react-native-paper';
import { listTickets, Ticket, TicketFilters } from '../../lib/tickets.api';
import { onTicketEvents } from '../../lib/realtime';

type Nav = { navigate: (route: 'Ticket' | 'TicketCreate', params?: { id?: string }) => void };
export function TicketsListScreen({ navigation }: { navigation: Nav }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<'all' | 'open' | 'waiting' | 'in_progress' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (reset = false) => {
    setLoading(true);
    const filters: TicketFilters = {};
    if (status !== 'all') filters.status = [status];
    if (priority) filters.priority = [priority];
    if (search.trim()) (filters as any).search = search.trim();
    const nextPage = reset ? 1 : page;
    const data = await listTickets(filters, { page: nextPage, limit: 20 });
    setItems((prev) => reset ? data : [...prev, ...data]);
    setHasMore(data.length === 20);
    setPage(nextPage + 1);
    setLoading(false);
  }, [status, search, priority, page]);

  useEffect(() => { fetchPage(true); }, [status, priority, fetchPage]);

  useEffect(() => {
    let stop: undefined | (() => void);
    (async () => {
      stop = await onTicketEvents({ created: () => fetchPage(true), updated: () => fetchPage(true), assigned: () => fetchPage(true), resolved: () => fetchPage(true) });
    })();
    return () => { if (stop) stop(); };
  }, [fetchPage]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <TextInput mode="outlined" placeholder="Search tickets" value={search} onChangeText={setSearch} onSubmitEditing={() => fetchPage(true)} left={<TextInput.Icon icon="magnify" />} />
        <View style={{ marginTop: 8 }}>
          <SegmentedButtons value={status} onValueChange={(v) => setStatus(v as typeof status)} buttons={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'waiting', label: 'Waiting' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'resolved', label: 'Resolved' },
          ]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {['low','medium','high','urgent'].map((p) => (
            <Chip key={p} selected={priority === p} onPress={() => setPriority(priority === p ? null : p)}>{p}</Chip>
          ))}
        </View>
      </View>

      {loading && items.length === 0 ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}

      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchPage(true)} />}
        onEndReached={() => { if (!loading && hasMore) fetchPage(false); }}
        renderItem={({ item }) => (
          <List.Item
            title={item.subject}
            description={`${item.priority.toUpperCase()} • ${item.status}`}
            left={(props) => <List.Icon {...props} icon="ticket" />}
            onPress={() => navigation.navigate('Ticket', { id: item.id })}
          />
        )}
      />
      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 16, bottom: 24 }}
        onPress={() => navigation.navigate('TicketCreate')}
      />
    </View>
  );
}

export default TicketsListScreen;


