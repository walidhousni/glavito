import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { TextInputField } from '../../components/ui/TextInputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { createApiClient } from '../../lib/api';
import { setTokens } from '../../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export const VerifyEmailScreen: React.FC<Props> = ({ route }) => {
  const theme = useTheme();
  const [token, setToken] = useState(route.params?.token || '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const api = createApiClient();
      const res = await api.post('/auth/verify-email', { token });
      const accessToken = String(res?.data?.accessToken || '');
      const refreshToken = String(res?.data?.refreshToken || '');
      if (accessToken) {
        await setTokens(accessToken, refreshToken || undefined);
      }
      setMessage('Email verified successfully. You can sign in now.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Verification failed';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
          Verify your email
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
          Paste the verification token you received by email
        </Text>

        <TextInputField label="Verification token" value={token} onChangeText={setToken} />
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
        <PrimaryButton title="Verify" onPress={onSubmit} loading={loading} />
      </View>
      <LoadingOverlay visible={loading} />
    </KeyboardAvoidingView>
  );
};


