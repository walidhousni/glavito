import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Chip, Divider, List, Text, TextInput } from 'react-native-paper';
import { SLAWidget } from '../../components/tickets/SLAWidget';
import { getTicket, updateTicket, addTicketNote, assignTicket } from '../../lib/tickets.api';

export function TicketDetailScreen({ route, navigation }: { route: { params: { id: string } }; navigation: any }) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const t = await getTicket(id);
    setTicket(t);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await load(); } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false };
  }, [load]);

  const onResolve = useCallback(async () => {
    await updateTicket(id, { status: 'resolved' } as any);
    await load();
  }, [id, load]);

  const onAssignMe = useCallback(async () => {
    // Assign to me: backend reads user from JWT; we pass current user id if needed.
    await assignTicket(id, 'me');
    await load();
  }, [id, load]);

  const onAddNote = useCallback(async () => {
    const content = note.trim();
    if (!content) return;
    setNote('');
    await addTicketNote(id, content, true);
    await load();
  }, [id, note, load]);

  if (loading) {
    return (<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>);
  }

  return (
    <View style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={ticket?.subject || 'Ticket'} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <Text variant="titleLarge">{ticket?.subject}</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>{ticket?.description}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Chip style={{ marginRight: 8 }}>{ticket?.status}</Chip>
          <Chip>{ticket?.priority}</Chip>
        </View>
        <Divider style={{ marginVertical: 12 }} />
        <SLAWidget
          firstResponseDue={(ticket as any)?.slaInstance?.firstResponseDue}
          resolutionDue={(ticket as any)?.slaInstance?.resolutionDue}
          firstResponseAt={(ticket as any)?.slaInstance?.firstResponseAt}
          resolutionAt={(ticket as any)?.slaInstance?.resolutionAt}
        />
        <Divider style={{ marginVertical: 12 }} />
        {ticket?.customer ? (
          <List.Item
            title={`${ticket.customer.firstName || ''} ${ticket.customer.lastName || ''}`.trim() || ticket.customer.email || 'Customer'}
            description={ticket.customer.email || ticket.customer.phone || ''}
            left={(props) => <List.Icon {...props} icon="account" />}
          />
        ) : null}
        <Divider style={{ marginVertical: 12 }} />
        <View style={{ flexDirection: 'row' }}>
          <Button mode="contained" onPress={onResolve} style={{ marginRight: 8 }}>Resolve</Button>
          <Button mode="outlined" onPress={onAssignMe}>Assign me</Button>
        </View>
        <Divider style={{ marginVertical: 12 }} />
        <TextInput
          mode="outlined"
          placeholder="Add a private note"
          value={note}
          onChangeText={setNote}
          right={<TextInput.Icon icon="send" onPress={onAddNote} />}
        />
        <Button style={{ marginTop: 12 }} onPress={() => navigation.navigate('TicketTimeline', { id })}>View Timeline</Button>
      </ScrollView>
    </View>
  );
}


