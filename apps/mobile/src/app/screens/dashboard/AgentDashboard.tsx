import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { KpiCard } from '../../components/ui/KpiCard';
import { fetchAgentPerformance } from '../../lib/analytics.api';

export function AgentDashboard() {
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await fetchAgentPerformance();
        if (!mounted) return;
        setPerf(p);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const metrics = perf?.metrics || {};

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <KpiCard title="Assigned" value={perf?.data?.assigned ?? metrics.ticketsHandled ?? 0} />
        <KpiCard title="Open" value={perf?.data?.open ?? 0} />
        <KpiCard title="Waiting" value={perf?.data?.waiting ?? 0} />
        <KpiCard title="Urgent" value={perf?.data?.urgent ?? 0} />
      </View>

      <View style={{ marginTop: 8 }}>
        <Text variant="titleMedium" style={{ marginHorizontal: 8, marginVertical: 8 }}>Performance</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <KpiCard title="Avg Response (m)" value={metrics.averageResponseTime ?? 0} />
          <KpiCard title="Avg Resolution (m)" value={metrics.averageResolutionTime ?? 0} />
          <KpiCard title="FCR %" value={metrics.firstContactResolution ?? 0} />
          <KpiCard title="CSAT" value={metrics.customerSatisfaction ?? 0} />
        </View>
      </View>
    </ScrollView>
  );
}


