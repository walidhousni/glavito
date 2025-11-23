import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { TextInputField } from '../../components/ui/TextInputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { Linking } from 'react-native';
import { createApiClient } from '../../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      await auth.login(email.trim(), password, tenantId);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Login failed';
      setError(String(msg));
    }
  };

  const startSso = async (provider: 'google' | 'microsoft') => {
    setError(null);
    try {
      const redirect = 'glavito://signin';
      const api = createApiClient();
      const res = await api.post(`/auth/sso/initiate/${provider}`, null, { params: { mode: 'mobile', redirect } });
      const url = String(res?.data?.url || '');
      if (!url) throw new Error('Failed to start SSO');
      await Linking.openURL(url);
      // When the backend redirects back to our deep link with tokens, react-navigation linking will trigger.
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'SSO failed';
      setError(String(msg));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
          Welcome back
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
          Sign in to continue to Glavito
        </Text>

        <TextInputField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInputField label="Tenant ID (optional)" value={tenantId || ''} onChangeText={setTenantId} />
        {error && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
            {error}
          </Text>
        )}

        <PrimaryButton title="Sign In" onPress={onSubmit} loading={auth.isLoading} />

        <View style={{ marginTop: 16 }} />
        <PrimaryButton title="Continue with Google" onPress={() => startSso('google')} loading={auth.isLoading} />
        <View style={{ height: 8 }} />
        <PrimaryButton title="Continue with Microsoft" onPress={() => startSso('microsoft')} loading={auth.isLoading} />

        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Forgot')}>
            <Text style={{ color: theme.colors.primary }}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: theme.colors.primary }}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
      <LoadingOverlay visible={auth.isLoading} />
    </KeyboardAvoidingView>
  );
};


