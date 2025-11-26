'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ticketsApi } from '@/lib/api/tickets-client';

export default function ActivityPage() {
  const t = useTranslations('dashboard.activityPage');
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState<string>('all');
  const [priority, setPriority] = React.useState<string>('all');
  const [items, setItems] = React.useState<Array<{ id: string; type: string; title: string; description?: string; user: string; time: string; priority?: string; metadata?: Record<string, unknown> }>>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketsApi.activityFeed({ limit: 50 });
      type Raw = { id: string; type: string; title: string; description?: string; user: string; time: string; priority?: string; metadata?: Record<string, unknown> };
      const maybeList: unknown = res as unknown;
      const list: Raw[] = Array.isArray(maybeList)
        ? (maybeList as Raw[])
        : (typeof maybeList === 'object' && maybeList !== null && Array.isArray((maybeList as { data?: unknown }).data)
            ? ((maybeList as { data: Raw[] }).data)
            : []);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const filtered = React.useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list.filter((it) => {
      const matchType = type === 'all' ? true : it.type === type;
      const matchPriority = priority === 'all' ? true : (it.priority || 'none') === priority;
      const matchQ = q
        ? (it.title?.toLowerCase().includes(q.toLowerCase()) || (it.description || '').toLowerCase().includes(q.toLowerCase()))
        : true;
      return matchType && matchPriority && matchQ;
    });
  }, [items, type, priority, q]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">{t('title')}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
          </div>
        </div>
      </motion.div>

      <Card className="premium-card border-0 shadow-2xl rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('filters.title')}</CardTitle>
          <CardDescription>{t('filters.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('filters.searchPlaceholder')} />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder={t('filters.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all')}</SelectItem>
                <SelectItem value="ticket">{t('filters.types.ticket')}</SelectItem>
                <SelectItem value="message">{t('filters.types.message')}</SelectItem>
                <SelectItem value="sla">{t('filters.types.sla')}</SelectItem>
                <SelectItem value="system">{t('filters.types.system')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder={t('filters.priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all')}</SelectItem>
                <SelectItem value="urgent">{t('filters.priorities.urgent')}</SelectItem>
                <SelectItem value="high">{t('filters.priorities.high')}</SelectItem>
                <SelectItem value="medium">{t('filters.priorities.medium')}</SelectItem>
                <SelectItem value="low">{t('filters.priorities.low')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => void load()} disabled={loading} className="w-full">{loading ? t('filters.loading') : t('filters.refresh')}</Button>
          </div>
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* <ActivityFeed activities={filtered as Array<{ id: string; type: 'ticket' | 'agent' | 'customer' | 'system' | 'message' | 'sla'; title: string; description?: string; user: string; time: string; priority?: 'low' | 'medium' | 'high' | 'urgent'; metadata?: Record<string, unknown> }>} loading={loading} showViewAll={false} /> */}
      </motion.div>
    </div>
  );
}


