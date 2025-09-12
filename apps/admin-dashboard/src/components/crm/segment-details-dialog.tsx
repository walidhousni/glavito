'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from 'next-intl';
import { crmApi } from '@/lib/api/crm-client';
import { BarChart3, Users, RefreshCw, Download } from 'lucide-react';

interface SegmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segmentId: string;
  segmentName?: string;
}

export function SegmentDetailsDialog({ open, onOpenChange, segmentId, segmentName }: SegmentDetailsDialogProps) {
  const t = useTranslations('crm');
  const [metrics, setMetrics] = React.useState<{ customerCount: number; averageValue: number; monthlyGrowth: number } | null>(null);
  const [preview, setPreview] = React.useState<{ sampleCount: number; totalMatched: number; sampleCustomerIds: string[] } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<'overview' | 'preview' | 'actions'>('overview');

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!open || !segmentId) return;
      setLoading(true);
      try {
        const [allMetrics, pvw] = await Promise.all([
          crmApi.segmentMetrics().catch(() => [] as any[]),
          crmApi.previewSegment(segmentId).catch(() => null),
        ]);
        if (cancelled) return;
        const m = Array.isArray(allMetrics) ? allMetrics.find((x: any) => x.segmentId === segmentId) : null;
        setMetrics(m ? { customerCount: m.customerCount, averageValue: m.averageValue, monthlyGrowth: m.monthlyGrowth } : null);
        setPreview(pvw);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, segmentId]);

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const res = await crmApi.exportSegment(segmentId, format);
      if (res.format === 'csv') {
        const blob = new Blob([res.data as string], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${segmentName || 'segment'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${segmentName || 'segment'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  };

  const recalc = async () => {
    try {
      await crmApi.recalcSegment(segmentId);
      // refresh metrics after recalc
      const all = await crmApi.segmentMetrics().catch(() => [] as any[]);
      const m = Array.isArray(all) ? all.find((x: any) => x.segmentId === segmentId) : null;
      setMetrics(m ? { customerCount: m.customerCount, averageValue: m.averageValue, monthlyGrowth: m.monthlyGrowth } : null);
    } catch {
      // no-op
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('segments.details.title')}</DialogTitle>
          <DialogDescription>
            {segmentName || ''}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="overview">{t('segments.details.metrics')}</TabsTrigger>
            <TabsTrigger value="preview">{t('segments.details.preview')}</TabsTrigger>
            <TabsTrigger value="actions">{t('segments.details.actions')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{t('segments.details.totalCustomers')}</div>
                      <div className="text-2xl font-semibold">{metrics?.customerCount ?? (loading ? '…' : 0)}</div>
                    </div>
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">{t('segments.details.avgValue')}</div>
                  <div className="text-2xl font-semibold">{metrics ? `$${metrics.averageValue}` : (loading ? '…' : '$0')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">{t('segments.details.monthlyGrowth')}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-semibold">{metrics ? `${metrics.monthlyGrowth}%` : (loading ? '…' : '0%')}</div>
                    {metrics && (
                      <Badge variant={metrics.monthlyGrowth >= 0 ? 'secondary' : 'outline'} className={metrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {metrics.monthlyGrowth >= 0 ? '↑' : '↓'}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BarChart3 className="h-4 w-4" />
                  {t('segments.details.summary')}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="text-sm text-gray-600">
                    {t('segments.details.totalMatched')}: <strong>{preview?.totalMatched ?? (loading ? '…' : 0)}</strong> • {t('segments.details.sampleCount')}: <strong>{preview?.sampleCount ?? (loading ? '…' : 0)}</strong>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void recalc()}>
                    <RefreshCw className="h-4 w-4 mr-1" /> {t('segments.details.recalculate')}
                  </Button>
                </div>
                <ScrollArea className="max-h-72">
                  <ul className="divide-y">
                    {(preview?.sampleCustomerIds || []).map((id) => (
                      <li key={id} className="px-4 py-3 text-sm text-gray-700 flex items-center justify-between">
                        <span>{id}</span>
                        <Badge variant="outline">ID</Badge>
                      </li>
                    ))}
                    {!loading && (!preview || (preview.sampleCustomerIds || []).length === 0) && (
                      <li className="px-4 py-6 text-center text-sm text-gray-500">{t('segments.details.noSample')}</li>
                    )}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={() => void exportData('json')}>
                <Download className="h-4 w-4" /> {t('segments.details.exportJson')}
              </Button>
              <Button variant="secondary" className="gap-2" onClick={() => void exportData('csv')}>
                <Download className="h-4 w-4" /> {t('segments.details.exportCsv')}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => void recalc()}>
                <RefreshCw className="h-4 w-4" /> {t('segments.details.recalculate')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


