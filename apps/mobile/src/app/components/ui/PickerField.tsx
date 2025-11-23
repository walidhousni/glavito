import React, { useState, useMemo } from 'react';
import { View, FlatList, Modal, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme, List, Divider, IconButton } from 'react-native-paper';

export function PickerField<T extends { id: string; name?: string | null }>(props: {
  label: string;
  value?: T | null;
  items: T[];
  onChange: (item: T | null) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return props.items;
    return props.items.filter((it) => (it.name || '').toLowerCase().includes(term));
  }, [q, props.items]);

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)}>
        <TextInput
          mode="outlined"
          label={props.label}
          value={props.value?.name || ''}
          placeholder={props.placeholder || 'Select'}
          right={<TextInput.Icon icon="chevron-down" />}
          editable={false}
        />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
            <IconButton icon="close" onPress={() => setOpen(false)} />
            <Text variant="titleLarge" style={{ marginLeft: 8 }}>{props.label}</Text>
          </View>
          <View style={{ padding: 16 }}>
            <TextInput mode="outlined" placeholder="Search" value={q} onChangeText={setQ} left={<TextInput.Icon icon="magnify" />} />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={Divider as any}
            renderItem={({ item }) => (
              <List.Item
                title={item.name || item.id}
                onPress={() => { props.onChange(item); setOpen(false); }}
              />
            )}
          />
          <View style={{ padding: 16 }}>
            <Button mode="text" onPress={() => { props.onChange(null); setOpen(false); }}>Clear</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}


