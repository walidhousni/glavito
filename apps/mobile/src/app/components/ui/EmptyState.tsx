import React from 'react';
import { View } from 'react-native';
import { Text, Button } from 'react-native-paper';

export function EmptyState(props: { title: string; subtitle?: string; actionLabel?: string; onActionPress?: () => void }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text variant="titleMedium" style={{ textAlign: 'center' }}>{props.title}</Text>
      {props.subtitle ? <Text variant="bodyMedium" style={{ marginTop: 6, opacity: 0.7, textAlign: 'center' }}>{props.subtitle}</Text> : null}
      {props.actionLabel ? (
        <Button mode="contained" style={{ marginTop: 16 }} onPress={props.onActionPress}>
          {props.actionLabel}
        </Button>
      ) : null}
    </View>
  );
}


