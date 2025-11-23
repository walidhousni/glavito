import React from 'react';
import { TextInput, HelperText } from 'react-native-paper';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'decimal-pad' | 'phone-pad' | 'url';
  errorText?: string | null;
};

export const TextInputField: React.FC<Props> = ({ label, value, onChangeText, secureTextEntry, autoCapitalize = 'none', keyboardType = 'default', errorText }) => {
  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={false}
        style={{ marginBottom: 8 }}
      />
      {Boolean(errorText) && <HelperText type="error">{errorText}</HelperText>}
    </>
  );
};


