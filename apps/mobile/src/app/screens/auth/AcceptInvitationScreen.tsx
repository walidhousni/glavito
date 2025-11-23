import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { TextInputField } from '../../components/ui/TextInputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { createApiClient, setTokens } from '../../lib/api';
import { Linking } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'AcceptInvitation'>;

export const AcceptInvitationScreen: React.FC<Props> = ({ route, navigation }) => {
  const theme = useTheme();
  const [token, setToken] = useState(route.params?.token || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) return;
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      try {
        const u = new URL(url);
        const t = u.searchParams.get('token');
        if (t) setToken(t);
      } catch {}
    });
  }, [token]);

  const onSubmit = async () => {
    setError(null);
    setMessage(null);
    if (!token) { setError('Missing token'); return; }
    setLoading(true);
    try {
      const api = createApiClient();
      const res = await api.post(`/auth/invitations/${token}/accept`, { firstName, lastName, password });
      const accessToken = String(res?.data?.accessToken || '');
      const refreshToken = String(res?.data?.refreshToken || '');
      if (accessToken) await setTokens(accessToken, refreshToken || undefined);
      setMessage('Invitation accepted. Redirecting...');
      setTimeout(() => navigation.replace('MainTabs'), 500);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Accept failed';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
          Join your team
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
          Complete your profile to accept the invitation
        </Text>
        <TextInputField label="First name" value={firstName} onChangeText={setFirstName} />
        <TextInputField label="Last name" value={lastName} onChangeText={setLastName} />
        <TextInputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
            {error}
          </Text>
        )}
        {message && (
          <Text variant="bodySmall" style={{ color: theme.colors.primary, marginBottom: 8 }}>
            {message}
          </Text>
        )}
        <PrimaryButton title="Accept invite" onPress={onSubmit} loading={loading} />
      </View>
      <LoadingOverlay visible={loading} />
    </KeyboardAvoidingView>
  );
};

export default AcceptInvitationScreen;


