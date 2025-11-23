import React from 'react';
import { Button } from 'react-native-paper';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
};

export const PrimaryButton: React.FC<Props> = ({ title, onPress, loading, disabled, icon }) => {
  return (
    <Button mode="contained" onPress={onPress} loading={loading} disabled={disabled} icon={icon} style={{ marginVertical: 6 }}>
      {title}
    </Button>
  );
};


