import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { TextInputField } from '../../components/ui/TextInputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      await auth.register({ email: email.trim(), password, firstName, lastName, tenantId });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Registration failed';
      setError(String(msg));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
          Create your account
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
          Get started with Glavito in seconds
        </Text>

        <TextInputField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <TextInputField label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <TextInputField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInputField label="Tenant ID (optional)" value={tenantId || ''} onChangeText={setTenantId} />
        {error && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
            {error}
          </Text>
        )}

        <PrimaryButton title="Create account" onPress={onSubmit} loading={auth.isLoading} />

        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-start' }}>
          <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
            <Text style={{ color: theme.colors.primary }}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
      <LoadingOverlay visible={auth.isLoading} />
    </KeyboardAvoidingView>
  );
};


