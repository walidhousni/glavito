'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { analyticsApi } from '@/lib/api/analytics-client'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { DollarSign, Package, CheckCircle2, Truck } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function SalesView() {
  const t = useTranslations('analytics')
  const { timeRange } = useAnalyticsStore()
  const [loading, setLoading] = React.useState<boolean>(false)
  const [summary, setSummary] = React.useState<{ orders: number; confirmations: number; deliveries: number; earnings: number }>({ orders: 0, confirmations: 0, deliveries: 0, earnings: 0 })
  const [daily, setDaily] = React.useState<Array<{ date: string; orders: number; confirmations: number; deliveries: number; earnings: number }>>([])
  const [customers, setCustomers] = React.useState<{ newCustomers: number; activeCustomers: number; revenuePerCustomer: number; averageOrderValue: number; repeatPurchaseRate: number }>({ newCustomers: 0, activeCustomers: 0, revenuePerCustomer: 0, averageOrderValue: 0, repeatPurchaseRate: 0 })
  const [segments, setSegments] = React.useState<Array<{ segment: string; revenue: number; customers: number }>>([])
  const [byChannel, setByChannel] = React.useState<Array<{ channel: string; revenue: number; percentage: number; tickets?: number; averageValue?: number }>>([])

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await (analyticsApi as any).getBusinessInsights(timeRange)
      setSummary(res.summary || { orders: 0, confirmations: 0, deliveries: 0, earnings: 0 })
      setDaily(Array.isArray(res?.trends?.daily) ? res.trends.daily : [])
      setCustomers(res.customers || { newCustomers: 0, activeCustomers: 0, revenuePerCustomer: 0, averageOrderValue: 0, repeatPurchaseRate: 0 })
      setSegments(Array.isArray(res.segments) ? res.segments : [])
      const rev = await analyticsApi.getRevenueAttribution(timeRange)
      setByChannel(Array.isArray(rev?.byChannel) ? rev.byChannel : [])
    } catch {
      setSummary({ orders: 0, confirmations: 0, deliveries: 0, earnings: 0 })
      setDaily([])
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  React.useEffect(() => { void load() }, [load])

  const cards = [
    { key: 'orders', label: 'Orders', value: summary.orders, icon: Package, color: 'from-blue-500 to-indigo-500' },
    { key: 'confirmations', label: 'Confirmations', value: summary.confirmations, icon: CheckCircle2, color: 'from-emerald-500 to-green-600' },
    { key: 'deliveries', label: 'Deliveries', value: summary.deliveries, icon: Truck, color: 'from-orange-500 to-amber-500' },
    { key: 'earnings', label: 'Earnings', value: summary.earnings, icon: DollarSign, color: 'from-purple-500 to-pink-500' },
  ] as const

  const chartConfig = {
    orders: { label: 'Orders', color: 'hsl(217.2 91.2% 59.8%)' },
    confirmations: { label: 'Confirmations', color: 'hsl(142.1 70.6% 45.3%)' },
    deliveries: { label: 'Deliveries', color: 'hsl(27.9 95.8% 53.1%)' },
    earnings: { label: 'Earnings', color: 'hsl(262.1 83.3% 57.8%)' },
  } as const

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.key} className="relative overflow-hidden">
            <div className={`absolute inset-x-0 -top-10 h-24 bg-gradient-to-r ${c.color} opacity-20 blur-2xl`} />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <c.icon className="h-4 w-4" /> {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {c.key === 'earnings' ? `$${Number(c.value || 0).toLocaleString()}` : Number(c.value || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer Metrics</CardTitle>
          <CardDescription>Key customer performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard label="New Customers" value={customers.newCustomers} />
            <MetricCard label="Active Customers" value={customers.activeCustomers} />
            <MetricCard label="Revenue per Customer" value={`$${customers.revenuePerCustomer.toFixed(2)}`} />
            <MetricCard label="Avg Order Value" value={`$${customers.averageOrderValue.toFixed(2)}`} />
            <MetricCard label="Repeat Purchase Rate" value={`${(customers.repeatPurchaseRate * 100).toFixed(1)}%`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
          <CardDescription>Daily performance trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[360px]">
            <AreaChart data={daily} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="orders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="confirmations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-confirmations)" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="var(--color-confirmations)" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="deliveries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-deliveries)" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="var(--color-deliveries)" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="earnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-earnings)" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="var(--color-earnings)" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="orders" stroke="var(--color-orders)" fill="url(#orders)" strokeWidth={2} />
              <Area type="monotone" dataKey="confirmations" stroke="var(--color-confirmations)" fill="url(#confirmations)" strokeWidth={2} />
              <Area type="monotone" dataKey="deliveries" stroke="var(--color-deliveries)" fill="url(#deliveries)" strokeWidth={2} />
              <Area type="monotone" dataKey="earnings" stroke="var(--color-earnings)" fill="url(#earnings)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {byChannel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Channel</CardTitle>
            <CardDescription>Attributed revenue by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Avg Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byChannel.map((row) => (
                    <TableRow key={row.channel}>
                      <TableCell className="font-medium capitalize">{row.channel}</TableCell>
                      <TableCell className="text-right">${Number(row.revenue || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{((row.percentage || 0) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{Number(row.tickets || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${Number(row.averageValue || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  )
}

