"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useMarketingStore } from '@/lib/store/marketing-store'
import { marketingApi } from '@/lib/api/marketing-client'
import { crmApi } from '@/lib/api/crm-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { 
  Mail, 
  MessageSquare, 
  Users, 
  Calendar,
  BarChart3,
  Plus,
  RefreshCw,
  Play,
  Clock,
  Settings,
  Target,
  Eye,
  Ticket,
} from 'lucide-react'
import { CampaignDialog } from '@/components/crm/campaign-dialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

function downloadData(data: string | Blob, filename: string, mime: string) {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function PerformanceChart({ campaignId }: { campaignId: string }) {
  const [chartData, setChartData] = useState<Array<{ date: string; openRate: number; clickRate: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock time series data; in real, fetch from /performance?period=30d
    const data = [
      { date: 'Day 1', openRate: 20, clickRate: 5 },
      { date: 'Day 2', openRate: 25, clickRate: 8 },
      { date: 'Day 3', openRate: 30, clickRate: 12 },
      { date: 'Day 4', openRate: 28, clickRate: 10 },
      { date: 'Day 5', openRate: 35, clickRate: 15 },
    ];
    setChartData(data);
    setLoading(false);
  }, [campaignId]);

  if (loading) return <div className="h-48 flex items-center justify-center">Loading chart...</div>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="openRate" stroke="#8884d8" name="Open Rate (%)" />
        <Line type="monotone" dataKey="clickRate" stroke="#82ca9d" name="Click Rate (%)" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CohortChart() {
  const data = [
    { segment: 'VIP', openRate: 45, clickRate: 20 },
    { segment: 'Regular', openRate: 30, clickRate: 10 },
    { segment: 'New', openRate: 25, clickRate: 5 },
  ];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid />
        <XAxis dataKey="segment" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="openRate" fill="#8884d8" name="Open Rate" />
        <Bar dataKey="clickRate" fill="#82ca9d" name="Click Rate" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function MarketingPage() {
  const t = useTranslations('marketing')
  const { campaigns, relatedTickets, loading, refresh, fetchRelatedTickets, create, launch, schedule } = useMarketingStore()
  const [perf, setPerf] = useState<Record<string, { openRate: number; clickRate: number; totals?: Record<string, number> }>>({})
  const [openCreate, setOpenCreate] = useState(false)
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', type: 'EMAIL', subject: '', segmentId: '' })
  const [waContent, setWaContent] = useState({ templateId: '', templateParams: '' })
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([])
  const [variants, setVariants] = useState<Record<string, Array<{ id: string; name: string; weight: number; subject?: string }>>>({})
  const [newVariant, setNewVariant] = useState<{ name: string; weight?: number; subject?: string }>({ name: '' })
  const [conversions, setConversions] = useState<Record<string, { total: number; revenue: number; currency?: string }>>({})

  // Add states
  const [frequency, setFrequency] = useState('weekly');
  const [email, setEmail] = useState('admin@example.com');
  const [ticketsExpandedMap, setTicketsExpandedMap] = useState<Record<string, boolean>>({});

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    (async () => {
      try {
        const list = await crmApi.listSegments()
        setSegments((list || []).map(s => ({ id: s.id, name: s.name })))
      } catch { setSegments([]) }
    })()
  }, [])
  useEffect(() => {
    const run = async () => {
      const entries = await Promise.all(campaigns.map(async (c) => ({ id: c.id, p: await marketingApi.performance(c.id) as { openRate: number; clickRate: number; totals?: Record<string, number> } })))
      const map: Record<string, { openRate: number; clickRate: number; totals?: Record<string, number> }> = {}
      for (const e of entries) map[e.id] = e.p
      setPerf(map)
      // Preload variants for visible campaigns
      const vMap: Record<string, Array<{ id: string; name: string; weight: number; subject?: string }>> = {}
      for (const c of campaigns) {
        try { vMap[c.id] = await marketingApi.listVariants(c.id) } catch { vMap[c.id] = [] }
      }
      setVariants(vMap)
      // Load conversions
      const convMap: Record<string, { total: number; revenue: number; currency?: string }> = {}
      for (const c of campaigns) {
        try {
          const list = await marketingApi.conversions(c.id)
          const total = list.length
          const revenue = list.reduce((sum, r) => sum + (r.amount || 0), 0)
          convMap[c.id] = { total, revenue, currency: (list[0]?.currency) }
        } catch { convMap[c.id] = { total: 0, revenue: 0 } }
      }
      setConversions(convMap)
    }
    if (campaigns.length) void run()
  }, [campaigns])

  const handleCreate = async () => {
    if (!form.name) return
    const payload: any = { ...form }
    if (form.type === 'WHATSAPP') {
      try {
        const params = waContent.templateParams ? JSON.parse(waContent.templateParams) : undefined
        payload.content = { text: form.description, templateId: waContent.templateId || undefined, templateParams: params }
      } catch {
        payload.content = { text: form.description }
      }
    }
    await create(payload)
    setOpenCreate(false)
    setForm({ name: '', description: '', type: 'EMAIL', subject: '', segmentId: '' })
    setWaContent({ templateId: '', templateParams: '' })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return <Mail className="h-4 w-4" />
      case 'SMS': return <MessageSquare className="h-4 w-4" />
      case 'SOCIAL': return <Users className="h-4 w-4" />
      case 'WEBINAR': return <Calendar className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'DRAFT': return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
      case 'SCHEDULED': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'COMPLETED': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  // Calculate total related tickets for stats
  const totalRelatedTickets = campaigns.reduce((sum, c) => sum + (relatedTickets[c.id]?.length || 0), 0)

  return (
    <div className="min-h-screen ticket-workspace p-6 space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between modern-card-interactive p-4"
      >
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('title')}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => refresh()} 
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('reload')}
          </Button>
          <Button onClick={async () => { if (!campaigns[0]) return; const data = await marketingApi.exportCampaign(campaigns[0].id, 'csv'); downloadData(data as any, 'campaign.csv', 'text/csv'); }}> {t('export.csv')} </Button>
          <Button variant="secondary" onClick={async () => { if (!campaigns[0]) return; const data = await marketingApi.exportCampaign(campaigns[0].id, 'pdf'); downloadData(data as any, 'campaign.pdf', 'application/pdf'); }}> {t('export.pdf')} </Button>
          <Button className="btn-gradient rounded-xl" onClick={() => setOpenCampaignDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('create')}
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('stats.totalCampaigns')}</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('stats.active')}</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'ACTIVE').length}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg">
                <Play className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('stats.avgOpenRate')}</p>
                <p className="text-2xl font-bold">
                  {campaigns.length > 0 ? 
                    (Object.values(perf).reduce((sum, p) => sum + p.openRate, 0) / Math.max(Object.keys(perf).length, 1) * 100).toFixed(1) + '%' : 
                    '0%'
                  }
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg">
                <Eye className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('stats.totalRelatedTickets') || 'Total Related Tickets'}</p>
                <p className="text-2xl font-bold">{totalRelatedTickets}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-lg">
                <Ticket className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* New: Overall Performance Chart */}
      {campaigns.length > 0 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>{t('charts.performanceTitle') || 'Performance Trends'}</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceChart campaignId={campaigns[0].id} /> {/* Or aggregate */}
          </CardContent>
        </Card>
      )}

      {/* New: Cohorts by Segment Chart */}
      {campaigns.length > 0 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>{t('cohorts.title') || 'Cohorts by Segment'}</CardTitle>
          </CardHeader>
          <CardContent>
            <CohortChart />
          </CardContent>
        </Card>
      )}

      {/* Campaigns Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => {
          const tickets = relatedTickets[c.id] || []
          const ticketsExpanded = !!ticketsExpandedMap[c.id]
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="modern-card-interactive h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                        {getTypeIcon(c.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{c.name}</CardTitle>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{c.type}</p>
                      </div>
                    </div>
                    <Badge className={`rounded-md text-xs ${getStatusColor(c.status)}`}>
                      {c.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {c.description || t('noDescription')}
                  </p>
                  
                  {/* Metrics */}
                  {perf[c.id] && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-slate-600 dark:text-slate-400">{t('metrics.openRate')}</div>
                        <div className="text-sm font-semibold text-green-600">
                          {(perf[c.id].openRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-600 dark:text-slate-400">{t('metrics.clickRate')}</div>
                        <div className="text-sm font-semibold text-blue-600">
                          {(perf[c.id].clickRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Conversions */}
                  {conversions[c.id] && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-emerald-50/40 dark:bg-emerald-900/20 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Conversions</div>
                        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {conversions[c.id].total}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Revenue</div>
                        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {(conversions[c.id].revenue / 100).toFixed(2)} {conversions[c.id].currency?.toUpperCase() || 'USD'}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* WhatsApp Delivery Badges */}
                  {perf[c.id] && perf[c.id].totals && (
                    <div className="flex flex-wrap gap-2">
                      {(['sent','delivered','opened','failed'] as const).map((k) => (
                        <span key={k} className={`analytics-badge ${k==='failed' ? 'analytics-badge-error' : k==='delivered' ? 'analytics-badge-success' : k==='opened' ? 'analytics-badge-info' : 'badge-info'} rounded-full px-2 py-1 text-xs`}>
                          {k}: {(perf[c.id].totals as Record<string, number>)[k] ?? 0}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Recent Deliveries */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="deliveries">
                      <AccordionTrigger className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {t('deliveries.recentDeliveries')}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="overflow-x-auto">
                          <DeliveriesList campaignId={c.id} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* New: Related Tickets Accordion */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="tickets">
                      <AccordionTrigger 
                        className="text-xs font-medium text-slate-600 dark:text-slate-400"
                        onClick={() => {
                          const next = !ticketsExpandedMap[c.id]
                          if (next && !relatedTickets[c.id]) {
                            fetchRelatedTickets(c.id)
                          }
                          setTicketsExpandedMap((m) => ({ ...m, [c.id]: next }))
                        }}
                      >
                        <Ticket className="h-3 w-3 mr-1 inline" />
                        {t('tickets.relatedTickets') || 'Related Tickets'} ({tickets.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        {tickets.length === 0 ? (
                          <div className="text-xs text-slate-500">{t('tickets.noRelated') || 'No related tickets yet'}</div>
                        ) : (
                          <div className="space-y-2">
                            {tickets.map((ticket) => (
                              <div key={ticket.id} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                                <div className="flex flex-col">
                                  <span className="font-medium">{ticket.subject}</span>
                                  <span className="text-slate-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>{ticket.status}</Badge>
                                  <Badge variant="outline">{ticket.priority}</Badge>
                                  {ticket.tags.includes('marketing') && <Badge variant="secondary">Marketing</Badge>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  {/* Spend */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{t('spent')}</span>
                    <span className="font-semibold">${c.spent ?? 0}</span>
                  </div>
                  
                  {/* Variants */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('variants.variants')}</div>
                    <div className="flex flex-col gap-2">
                      {(variants[c.id] || []).map(v => (
                        <div key={v.id} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                          <div className="flex items-center gap-2"><span className="font-medium">{v.name}</span><span className="text-slate-500">{v.weight}%</span></div>
                          {!!v.subject && <span className="text-slate-500">{v.subject}</span>}
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder={t('variants.namePlaceholder')} value={newVariant.name} onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })} />
                        <Input placeholder={t('variants.weightPlaceholder')} type="number" value={newVariant.weight ?? ''} onChange={(e) => setNewVariant({ ...newVariant, weight: Number(e.target.value) })} />
                        <Input placeholder={t('variants.subjectPlaceholder')} value={newVariant.subject ?? ''} onChange={(e) => setNewVariant({ ...newVariant, subject: e.target.value })} />
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={async () => {
                          if (!newVariant.name) return
                          await marketingApi.createVariant(c.id, { name: newVariant.name, weight: newVariant.weight, subject: newVariant.subject })
                          const list = await marketingApi.listVariants(c.id).catch(() => [])
                          setVariants((m) => ({ ...m, [c.id]: list }))
                          setNewVariant({ name: '' })
                        }}>{t('variants.addVariant')}</Button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="rounded-lg" 
                      onClick={() => launch(c.id)} 
                      disabled={c.status === 'ACTIVE'}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {t('actions.launch')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-lg"
                      onClick={() => schedule(c.id, new Date().toISOString())}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {t('actions.scheduleNow')}
                    </Button>
                  </div>
                  
                  <Link 
                    href="./workflows" 
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {t('actions.manageWorkflows')}
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
        
        {!loading && campaigns.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center py-12"
          >
            <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {t('emptyTitle') || 'No campaigns yet'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t('empty') || 'Get started by creating your first marketing campaign.'}
            </p>
            <Button className="btn-gradient rounded-xl" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('create')}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Create Campaign Form (legacy inline) */}
      {openCreate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                {t('createTitle') || 'Create New Campaign'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('fields.name')}
                  </label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    className="rounded-lg"
                    placeholder={t('placeholders.name') || 'Campaign name'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('fields.type')}
                  </label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder={t('placeholders.selectType') || 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {['EMAIL','WHATSAPP','SMS','SOCIAL','WEBINAR','CONTENT','PAID_ADS'].map((k) => (
                        <SelectItem key={k} value={k} className="flex items-center">
                          <div className="flex items-center">
                            {getTypeIcon(k)}
                            <span className="ml-2">{k}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('fields.subject')}
                </label>
                <Input 
                  value={form.subject} 
                  onChange={(e) => setForm({ ...form, subject: e.target.value })} 
                  className="rounded-lg"
                  placeholder={t('placeholders.emailSubject') || 'Email subject or campaign title'}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('fields.description')}
                </label>
                <Textarea 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  className="rounded-lg"
                  placeholder={t('placeholders.description') || 'Describe your campaign goals and content'}
                  rows={3}
                />
              </div>

              {form.type === 'WHATSAPP' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('fields.templateId')}</label>
                    <Input 
                      value={waContent.templateId}
                      onChange={(e) => setWaContent({ ...waContent, templateId: e.target.value })}
                      className="rounded-lg"
                      placeholder={t('placeholders.templateId') || 'e.g., order_confirmation'}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('fields.templateParams')}</label>
                    <Input 
                      value={waContent.templateParams}
                      onChange={(e) => setWaContent({ ...waContent, templateParams: e.target.value })}
                      className="rounded-lg"
                      placeholder={t('placeholders.templateParams') || '{"orderId":"12345"}'}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setOpenCreate(false)}
                  className="rounded-lg"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!form.name}
                  className="btn-gradient rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Campaign Dialog (preferred UX) */}
      <CampaignDialog open={openCampaignDialog} onOpenChange={setOpenCampaignDialog} segmentId={''} />

      {/* Scheduler Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('scheduler.title') || 'Schedule Reports'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={async (e) => { e.preventDefault(); try { await marketingApi.scheduleReport({ frequency: frequency as 'weekly' | 'monthly', email }); alert(t('scheduler.success') || 'Scheduled!'); } catch (err) { console.error(err) } }} className="space-y-4">
            <Select value={frequency} onValueChange={(v) => setFrequency(v as 'weekly' | 'monthly')}>
              <SelectTrigger>
                <SelectValue placeholder={t('scheduler.frequency')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t('scheduler.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('scheduler.monthly')}</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder={t('scheduler.email')} 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <Button type="submit" onClick={async (e) => { e.preventDefault(); try { await marketingApi.scheduleReport({ frequency: frequency as 'weekly' | 'monthly', email }); alert(t('scheduler.success') || 'Scheduled!'); } catch (err) { console.error(err) } }}>
              {t('scheduler.schedule')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function DeliveriesList({ campaignId }: { campaignId: string }) {
  const t = useTranslations('marketing')
  const [items, setItems] = useState<Array<{ id: string; status: string; channel: string; customer: { id: string; email?: string; firstName?: string; lastName?: string }; variant?: { id: string; name: string }; sentAt?: string; openedAt?: string; clickedAt?: string }>>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { setLoading(true); const list = await marketingApi.deliveries(campaignId); if (!cancelled) setItems(list || []) } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [campaignId])
  if (loading && items.length === 0) return <div className="skeleton h-10 rounded" />
  if (!items.length) return <div className="text-xs text-slate-500">{t('deliveries.noRecent') || 'No recent deliveries'}</div>
  return (
    <div className="space-y-2 overflow-x-auto">
      {items.slice(0, 5).map(d => (
        <div key={d.id} className="flex items-center justify-between rounded border px-3 py-2 text-xs min-w-max">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${d.status === 'failed' ? 'bg-red-100 text-red-700' : d.status === 'opened' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{d.status}</span>
            <span className="text-slate-600">{(d.customer.firstName || d.customer.lastName) ? `${d.customer.firstName || ''} ${d.customer.lastName || ''}`.trim() : d.customer.email}</span>
          </div>
          <div className="text-slate-500">{d.variant?.name || d.channel}</div>
        </div>
      ))}
    </div>
  )
}


