import React from 'react';
import { View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { VictoryPie, VictoryChart, VictoryBar, VictoryLine, VictoryTheme, VictoryAxis, VictoryLegend } from 'victory-native';

type XY = { x: string | number; y: number };

export function ChartCard(props: {
  title: string;
  type: 'pie' | 'bar' | 'line';
  data: XY[] | { series: Array<{ name: string; data: XY[] }> };
  height?: number;
}) {
  const h = props.height ?? (props.type === 'pie' ? 220 : 260);
  return (
    <Card style={{ flex: 1, margin: 8 }}>
      <Card.Content>
        <Text variant="titleSmall" style={{ marginBottom: 8 }}>{props.title}</Text>
        <View style={{ height: h }}>
          {props.type === 'pie' && Array.isArray(props.data) ? (
            <VictoryPie
              data={props.data}
              animate={{ duration: 500 }}
              innerRadius={40}
              padAngle={2}
              labels={({ datum }) => `${datum.x}: ${datum.y}`}
            />
          ) : null}

          {props.type === 'bar' && Array.isArray(props.data) ? (
            <VictoryChart animate={{ duration: 500 }} theme={VictoryTheme.material} domainPadding={{ x: 20 }}>
              <VictoryAxis style={{ tickLabels: { fontSize: 10, angle: 0 } }} />
              <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
              <VictoryBar data={props.data} />
            </VictoryChart>
          ) : null}

          {props.type === 'line' && !Array.isArray(props.data) ? (
            <VictoryChart animate={{ duration: 500 }} theme={VictoryTheme.material}>
              <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
              <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
              {(props.data.series || []).map((s, idx) => (
                <VictoryLine key={s.name || idx} data={s.data} />
              ))}
              <VictoryLegend x={40} y={0} orientation="horizontal" gutter={12} data={(props.data.series || []).map((s) => ({ name: s.name }))} />
            </VictoryChart>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}


