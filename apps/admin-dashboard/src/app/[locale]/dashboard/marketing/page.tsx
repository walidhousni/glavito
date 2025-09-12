"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useMarketingStore } from '@/lib/store/marketing-store'
import { marketingApi } from '@/lib/api/marketing-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  MousePointer
} from 'lucide-react'

export default function MarketingPage() {
  const t = useTranslations('marketing')
  const { campaigns, loading, refresh, create, launch, schedule } = useMarketingStore()
  const [perf, setPerf] = useState<Record<string, { openRate: number; clickRate: number }>>({})
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', type: 'EMAIL', subject: '', segmentId: '' })

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const run = async () => {
      const entries = await Promise.all(campaigns.map(async (c) => ({ id: c.id, p: await marketingApi.performance(c.id) as { openRate: number; clickRate: number } })))
      const map: Record<string, { openRate: number; clickRate: number }> = {}
      for (const e of entries) map[e.id] = e.p
      setPerf(map)
    }
    if (campaigns.length) void run()
  }, [campaigns])

  const handleCreate = async () => {
    if (!form.name) return
    await create({ ...form })
    setOpenCreate(false)
    setForm({ name: '', description: '', type: 'EMAIL', subject: '', segmentId: '' })
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

  return (
    <div className="min-h-screen gradient-bg-primary p-6 space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
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
          <Button className="btn-gradient rounded-xl" onClick={() => setOpenCreate(true)}>
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
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'ACTIVE').length}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg">
                <Play className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Open Rate</p>
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

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Click Rate</p>
                <p className="text-2xl font-bold">
                  {campaigns.length > 0 ? 
                    (Object.values(perf).reduce((sum, p) => sum + p.clickRate, 0) / Math.max(Object.keys(perf).length, 1) * 100).toFixed(1) + '%' : 
                    '0%'
                  }
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-lg">
                <MousePointer className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Campaigns Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="premium-card hover-card h-full">
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
                      <div className="text-xs text-slate-600 dark:text-slate-400">Open Rate</div>
                      <div className="text-sm font-semibold text-green-600">
                        {(perf[c.id].openRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-600 dark:text-slate-400">Click Rate</div>
                      <div className="text-sm font-semibold text-blue-600">
                        {(perf[c.id].clickRate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Spend */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{t('spent')}</span>
                  <span className="font-semibold">${c.spent ?? 0}</span>
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
        ))}
        
        {!loading && campaigns.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center py-12"
          >
            <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t('empty')}
            </p>
            <Button className="btn-gradient rounded-xl" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('create')}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Create Campaign Form */}
      {openCreate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Create New Campaign
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
                    placeholder="Campaign name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('fields.type')}
                  </label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['EMAIL','SMS','SOCIAL','WEBINAR','CONTENT','PAID_ADS'].map((k) => (
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
                  placeholder="Email subject or campaign title"
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
                  placeholder="Describe your campaign goals and content"
                  rows={3}
                />
              </div>
              
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
    </div>
  )
}


