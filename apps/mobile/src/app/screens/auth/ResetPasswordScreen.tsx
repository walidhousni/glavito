import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { TextInputField } from '../../components/ui/TextInputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { createApiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Linking } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const theme = useTheme();
  const auth = useAuth();
  const [token, setToken] = useState(route.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    if (!password || password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const api = createApiClient();
      await api.post('/auth/password-reset/confirm', { token, password });
      setMessage('Password reset successfully. You can sign in now.');
      setTimeout(() => navigation.replace('SignIn'), 1000);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Reset failed';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
          Reset password
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
          Enter your new password to complete the reset
        </Text>

        <TextInputField label="New password" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInputField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
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
        <PrimaryButton title="Reset password" onPress={onSubmit} loading={loading || auth.isLoading} />
      </View>
      <LoadingOverlay visible={loading || auth.isLoading} />
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;


