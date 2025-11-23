import React from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme, ProgressBar } from 'react-native-paper';

export function KpiCard(props: {
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number; // 0..1
  color?: string;
}) {
  const theme = useTheme();
  const color = props.color || theme.colors.primary;
  return (
    <Card style={{ flex: 1, margin: 8 }}>
      <Card.Content>
        <Text variant="labelSmall" style={{ opacity: 0.7 }}>{props.title}</Text>
        <Text variant="headlineMedium" style={{ marginTop: 4 }}>{String(props.value)}</Text>
        {props.subtitle ? <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 2 }}>{props.subtitle}</Text> : null}
        {typeof props.progress === 'number' ? (
          <View style={{ marginTop: 8 }}>
            <ProgressBar progress={Math.max(0, Math.min(1, props.progress))} color={color} />
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}


