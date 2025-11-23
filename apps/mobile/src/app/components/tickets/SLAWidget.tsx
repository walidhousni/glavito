import React from 'react';
import { View } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';

export function SLAWidget(props: { firstResponseDue?: string; resolutionDue?: string; firstResponseAt?: string; resolutionAt?: string }) {
  const theme = useTheme();
  const now = Date.now();
  const due = props.resolutionDue ? new Date(props.resolutionDue).getTime() : 0;
  const created = props.firstResponseDue ? new Date(props.firstResponseDue).getTime() - 60 * 60 * 1000 : now - 60 * 60 * 1000; // crude baseline
  const pct = due > created ? Math.min(1, Math.max(0, (now - created) / (due - created))) : 0.2;
  const label = props.resolutionAt ? 'Resolved' : `Due: ${props.resolutionDue ? new Date(props.resolutionDue).toLocaleString() : 'N/A'}`;
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="labelSmall">SLA</Text>
      <ProgressBar progress={pct} color={pct > 0.8 ? theme.colors.error : theme.colors.primary} style={{ marginTop: 6 }} />
      <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>{label}</Text>
    </View>
  );
}


