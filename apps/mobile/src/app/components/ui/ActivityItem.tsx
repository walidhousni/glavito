import React from 'react';
import { List, Text } from 'react-native-paper';

export function ActivityItem(props: {
  title: string;
  description?: string;
  right?: string;
  leftIcon?: string;
  onPress?: () => void;
}) {
  return (
    <List.Item
      title={props.title}
      description={props.description}
      onPress={props.onPress}
      left={props.leftIcon ? (iconProps) => <List.Icon {...iconProps} icon={props.leftIcon!} /> : undefined}
      right={props.right ? () => <Text style={{ opacity: 0.6 }}>{props.right}</Text> : undefined}
    />
  );
}


