'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, ListChecks } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type TrendPoint = { date: string; clarityScore?: number; fillerWordRate?: number; sentimentBalance?: number };
type TrendsResponse = { byDay: TrendPoint[]; totals: { count: number; avgClarity?: number; avgFillerRate?: number; avgSentimentBalance?: number } };
type RecsResponse = { strengths: Array<{ text: string; count: number }>; improvements: Array<{ text: string; count: number }>; actions: Array<{ text: string; count: number }>; };

export default function CoachingDashboardPage() {
  const t = useTranslations('coaching');
  const [loading, setLoading] = React.useState(true);
  const [trends, setTrends] = React.useState<TrendsResponse | null>(null);
  const [recs, setRecs] = React.useState<RecsResponse | null>(null);
  const [effectiveness, setEffectiveness] = React.useState<{ windowDays: number; score: number; metrics: { clarityDelta?: number; fillerDelta?: number; sentimentDelta?: number; samples: number } } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [agentId, setAgentId] = React.useState<string>('');
  const [recent, setRecent] = React.useState<Array<{ id: string; content: string; confidence: number; createdAt: string }> | null>(null);
  const [agents, setAgents] = React.useState<Array<{ id: string; name: string; avatar?: string }>>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const { aiApi } = await import('@/lib/api/ai-client');
        const today = new Date();
        const from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = today.toISOString();
        const [trendData, recData, eff, recentData] = await Promise.all([
          aiApi.coachingTrends({ from, to }),
          aiApi.coachingRecommendations(10),
          aiApi.coachingEffectiveness(undefined, 30),
          aiApi.recentAnalyses(20, agentId || undefined),
        ]);
        if (!cancelled) {
          setTrends(trendData as TrendsResponse);
          setRecs(recData as RecsResponse);
          setEffectiveness(eff);
          setRecent((recentData || []).map((r: { id: string; content: string; confidence: number; createdAt: string }) => ({ id: r.id, content: r.content, confidence: r.confidence, createdAt: r.createdAt })));
        }
      } catch (e) {
        const err = e as { message?: string };
        if (!cancelled) setError(err?.message || 'Failed to load coaching data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true };
  }, [agentId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { agentApi } = await import('@/lib/api/team');
        const profiles = await agentApi.getAgentProfiles();
        if (!cancelled) {
          const mapped = (profiles || []).map((p: any) => ({
            id: p.user?.id || p.id,
            name: p.displayName || `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim() || p.user?.email || 'Agent',
            avatar: p.user?.avatar,
          }));
          setAgents(mapped);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true };
  }, []);

  const avgClarity = Math.round(((trends?.totals?.avgClarity ?? 0) * 100));
  const avgFiller = Math.round(((trends?.totals?.avgFillerRate ?? 0) * 100));
  const avgSentiment = Math.round(((trends?.totals?.avgSentimentBalance ?? 0) * 100));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <Badge variant="secondary" className="ml-2">{trends?.totals?.count ?? 0} analyses</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All agents</SelectItem>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>{t('trends')}</Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600" /> Clarity</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isFinite(avgClarity) ? `${avgClarity}%` : '—'}</div>
            <Progress value={isFinite(avgClarity) ? avgClarity : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-600" /> Filler</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isFinite(avgFiller) ? `${avgFiller}%` : '—'}</div>
            <Progress value={isFinite(avgFiller) ? avgFiller : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Sentiment</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isFinite(avgSentiment) ? `${avgSentiment}%` : '—'}</div>
            <Progress value={isFinite(avgSentiment) ? avgSentiment : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Effectiveness</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeof effectiveness?.score === 'number' ? `${effectiveness.score}` : '—'}</div>
            <div className="text-xs text-gray-500 mt-1">Δ clarity {(Math.round(((effectiveness?.metrics?.clarityDelta ?? 0) * 100)))}%, Δ filler {(Math.round(((effectiveness?.metrics?.fillerDelta ?? 0) * 100)))}%, Δ sentiment {(Math.round(((effectiveness?.metrics?.sentimentDelta ?? 0) * 100)))}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600" /> {t('trends')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            {!loading && (trends?.byDay?.length ? (
              <div className="space-y-2">
                {trends.byDay.slice(-14).map((p) => (
                  <div key={p.date} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-500">{p.date}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.round(((p.clarityScore ?? 0) * 100))}%` }} />
                    </div>
                    <div className="w-12 text-right text-xs text-gray-600">{Math.round(((p.clarityScore ?? 0) * 100))}%</div>
                  </div>
                ))}
                {/* Sparkline */}
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-1">Clarity (14d)</div>
                  <div className="h-12 w-full">
                    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-full">
                      {(() => {
                        const pts = (trends?.byDay?.slice(-14) || []).map((p, i, arr) => {
                          const x = arr.length > 1 ? (i / (arr.length - 1)) * 100 : 0;
                          const y = 24 - Math.max(0, Math.min(24, ((p.clarityScore ?? 0) * 24)));
                          return `${x},${y}`;
                        }).join(' ');
                        return <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={pts} />;
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            ) : <div className="text-sm text-gray-500">No data</div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4 text-sky-600" /> Recent analyses{agentId ? ' (agent)' : ''}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            {!loading && (recent?.length ? (
              <ul className="text-sm space-y-2">
                {recent.slice(0, 10).map(r => (
                  <li key={r.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <div className="line-clamp-1 text-gray-700" title={r.content}>{r.content}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100">{Math.round((r.confidence ?? 0) * 100)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <div className="text-sm text-gray-500">No recent analyses</div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


