import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { KpiCard } from '../../components/ui/KpiCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { fetchRealTimeMetrics, fetchKPIs, fetchBusinessInsights, KPI } from '../../lib/analytics.api';

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [rt, setRt] = useState<any>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [bi, setBi] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [r, k, b] = await Promise.all([
          fetchRealTimeMetrics(),
          fetchKPIs(),
          fetchBusinessInsights(),
        ]);
        if (!mounted) return;
        setRt(r);
        setKpis(k);
        setBi(b);
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

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <KpiCard title="Active Tickets" value={rt?.activeTickets ?? 0} />
        <KpiCard title="Active Agents" value={rt?.activeAgents ?? 0} />
        <KpiCard title="Avg Response (m)" value={rt?.averageResponseTime ?? 0} />
        <KpiCard title="CSAT" value={(rt?.customerSatisfactionScore ?? 0).toFixed(2)} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <ChartCard
          title="Priority distribution"
          type="pie"
          data={(rt?.priorityDistribution || []).map((p: any) => ({ x: p.name || p.priority || 'N/A', y: Number(p.value || p.count || 0) }))}
        />
        <ChartCard
          title="Tickets trend"
          type="line"
          data={{ series: [{ name: 'Total', data: (bi?.trends || []).map((d: any) => ({ x: d.date || d.day || '', y: d.total || 0 })) }] }}
        />
      </View>

      {kpis?.length ? (
        <View style={{ marginTop: 8 }}>
          <Text variant="titleMedium" style={{ marginHorizontal: 8, marginVertical: 8 }}>Key KPIs</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {kpis.map((k) => (
              <KpiCard key={k.id} title={k.name} value={k.value} subtitle={k.description} />
            ))}
          </View>
        </View>
      ) : null}

      {bi?.summary ? (
        <View style={{ marginTop: 8 }}>
          <Text variant="titleMedium" style={{ marginHorizontal: 8, marginVertical: 8 }}>Business</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <KpiCard title="Orders" value={bi.summary.orders ?? 0} />
            <KpiCard title="Confirmations" value={bi.summary.confirmations ?? 0} />
            <KpiCard title="Deliveries" value={bi.summary.deliveries ?? 0} />
            <KpiCard title="Earnings" value={bi.summary.earnings ?? 0} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}


