import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, Image } from 'react-native';
import { ActivityIndicator, Appbar, IconButton, TextInput, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../../lib/files.api';
import { fetchConversationDetails, sendConversationMessage } from '../../lib/conversations.api';

export function ConversationScreen({ route, navigation }: { route: { params: { id: string } }; navigation: any }) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [text, setText] = useState('');
  const inputRef = useRef<any>(null);

  const load = useCallback(async () => {
    const res = await fetchConversationDetails(id);
    setData(res);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await load(); } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false };
  }, [load]);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    await sendConversationMessage(id, { content, messageType: 'text' });
    await load();
    try { inputRef.current?.focus?.(); } catch {}
  }, [id, text, load]);

  const pickAndSendImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const uploaded = await uploadFile({ uri: asset.uri, name: asset.fileName || undefined, type: (asset as any).mimeType || 'image/jpeg' });
    const url = uploaded?.url || uploaded?.Location || uploaded?.location || uploaded?.file?.url;
    if (url) {
      await sendConversationMessage(id, { content: url, messageType: 'image' as any });
      await load();
    }
  }, [id, load]);

  if (loading) {
    return (<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>);
  }

  const messages: Array<any> = data?.data?.messages || data?.messages || [];
  const thread = data?.data?.conversation || data?.conversation || { subject: 'Conversation' };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={thread.subject || 'Conversation'} />
      </Appbar.Header>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 6, alignSelf: item.senderType === 'agent' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <View style={{ backgroundColor: item.senderType === 'agent' ? '#DCF2FF' : '#F1F1F1', borderRadius: 10, padding: 10 }}>
              {item.messageType === 'image' ? (
                <View>
                  {/* Simple image preview using native <img> on web and react-native Image on native; fallback to link */}
                  {/* @ts-ignore platform-agnostic: react-native Image */}
                  <Image
                    source={{ uri: item.content }}
                    style={{ width: 200, height: 200, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Text>{item.content}</Text>
              )}
            </View>
            <Text style={{ opacity: 0.6, marginTop: 4, fontSize: 12 }}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
        <IconButton icon="image" onPress={pickAndSendImage} />
        <TextInput
          ref={inputRef}
          mode="outlined"
          placeholder="Type a message"
          style={{ flex: 1, marginRight: 8 }}
          value={text}
          onChangeText={setText}
        />
        <IconButton icon="send" onPress={send} disabled={!text.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}


