import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { TextInputField } from '../../components/ui/TextInputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Forgot'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setMessage(null);
    try {
      await auth.requestPasswordReset(email.trim());
      setMessage('If the email exists, a reset link has been sent');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Request failed';
      setError(String(msg));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
          Forgot password
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
          Enter your email to receive a reset link
        </Text>

        <TextInputField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
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
        <PrimaryButton title="Send reset link" onPress={onSubmit} loading={auth.isLoading} />

        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-start' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.colors.primary }}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
      <LoadingOverlay visible={auth.isLoading} />
    </KeyboardAvoidingView>
  );
};


