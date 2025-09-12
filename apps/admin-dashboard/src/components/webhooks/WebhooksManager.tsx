'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { webhooksApi, type WebhookEndpoint, type CreateWebhookEndpointDto } from '@/lib/api/webhooks-client';
import { useTranslations } from 'next-intl';
import { Trash2, Plus, Link2, Shield, RefreshCw, CheckCircle2, Copy, TestTube, X, AlertTriangle } from 'lucide-react';

type KV = { key: string; value: string };

const COMMON_EVENTS = [
  'conversation.message.received',
  'conversation.message.sent',
  'ticket.created',
  'ticket.updated',
  'ticket.closed',
  'workflow.executed',
  'workflow.failed',
];

export function WebhooksManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations('webhooks');
  const [loading, setLoading] = React.useState(false);
  const [endpoints, setEndpoints] = React.useState<WebhookEndpoint[]>([]);
  const [createLoading, setCreateLoading] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState<string | null>(null);
  const [testLoading, setTestLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>(['conversation.message.received']);
  const [customEvent, setCustomEvent] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [headers, setHeaders] = React.useState<KV[]>([]);
  const [retry, setRetry] = React.useState<{ maxRetries?: number; retryDelay?: number; backoffMultiplier?: number }>({ maxRetries: 3, retryDelay: 2, backoffMultiplier: 2 });

  const [testEvent, setTestEvent] = React.useState('conversation.message.received');
  const [testTenantId, setTestTenantId] = React.useState('current');
  const [testPayload, setTestPayload] = React.useState('{"message":"Hello from admin UI"}');
  const [toast, setToast] = React.useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await webhooksApi.listEndpoints();
      setEndpoints(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load endpoints');
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const addHeader = () => setHeaders((prev) => [...prev, { key: '', value: '' }]);
  const updateHeader = (idx: number, patch: Partial<KV>) => setHeaders((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  const removeHeader = (idx: number) => setHeaders((prev) => prev.filter((_, i) => i !== idx));

  const addCustomEvent = () => {
    const ev = customEvent.trim();
    if (!ev) return;
    setSelectedEvents((prev) => Array.from(new Set([...prev, ev])));
    setCustomEvent('');
  };

  const toggleEvent = (ev: string) => {
    setSelectedEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  };

  const canCreate = name.trim().length > 1 && /^https?:\/\//.test(url) && selectedEvents.length > 0;

  const createEndpoint = async () => {
    if (!canCreate) return;
    setCreateLoading(true);
    try {
      const payload: CreateWebhookEndpointDto = {
        name: name.trim(),
        url: url.trim(),
        events: selectedEvents,
        ...(secret ? { secret } : {}),
        ...(headers.length ? { headers: headers.filter((h) => h.key).reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {} as Record<string, string>) } : {}),
        retryPolicy: retry,
      };
      await webhooksApi.createEndpoint(payload);
      setToast({ type: 'success', msg: 'Endpoint created' });
      setName('');
      setUrl('');
      setSecret('');
      setHeaders([]);
      setSelectedEvents(['conversation.message.received']);
      await load();
    } catch (e) {
      setToast({ type: 'error', msg: e instanceof Error ? e.message : 'Failed to create endpoint' });
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteEndpoint = async (id: string) => {
    if (!id) return;
    setDeleteLoading(id);
    try {
      await webhooksApi.deleteEndpoint(id);
      setToast({ type: 'success', msg: 'Endpoint deleted' });
      await load();
    } catch (e) {
      setToast({ type: 'error', msg: e instanceof Error ? e.message : 'Delete failed' });
    } finally {
      setDeleteLoading(null);
    }
  };

  const sendTest = async () => {
    setTestLoading(true);
    try {
      let extra: Record<string, unknown> = {};
      try { extra = JSON.parse(testPayload || '{}'); } catch { extra = {}; }
      await webhooksApi.sendTestEvent(testEvent, testTenantId || 'current', extra);
      setToast({ type: 'success', msg: 'Test event sent' });
    } catch (e) {
      setToast({ type: 'error', msg: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTestLoading(false);
    }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setToast({ type: 'info', msg: 'Copied' }); } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl premium-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            {t('manager.title', { default: 'Webhooks Manager' })}
          </DialogTitle>
        </DialogHeader>

        {toast && (
          <div className={`mb-3 text-sm rounded-md border px-3 py-2 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            {toast.msg}
          </div>
        )}

        {error && (
          <div className="mb-3 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('manager.endpoints', { default: 'Endpoints' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                {!loading && endpoints.length === 0 && (
                  <div className="text-sm text-muted-foreground">{t('manager.noEndpoints', { default: 'No endpoints yet' })}</div>
                )}
                {!loading && endpoints.length > 0 && (
                  <div className="space-y-2">
                    {endpoints.map((ep) => (
                      <EndpointRow key={ep.id} endpoint={ep} onDelete={() => deleteEndpoint(ep.id)} onCopy={copy} setTestEvent={(ev) => setTestEvent(ev)} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('manager.create', { default: 'Create Endpoint' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My listener" />
                </div>
                <div>
                  <Label className="text-xs">Secret (optional)</Label>
                  <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Signing secret" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">URL</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks/incoming" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Events</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_EVENTS.map((ev) => (
                    <button key={ev} type="button" onClick={() => toggleEvent(ev)} className={`px-2 py-1 rounded border text-xs ${selectedEvents.includes(ev) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-transparent'}`}>
                      {ev}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input value={customEvent} onChange={(e) => setCustomEvent(e.target.value)} placeholder="custom.event.name" />
                  <Button type="button" onClick={addCustomEvent}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedEvents.map((ev) => (
                    <span key={ev} className="chip chip-primary flex items-center">
                      {ev}
                      <button aria-label="remove" className="ml-2 opacity-70 hover:opacity-100" onClick={() => toggleEvent(ev)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Headers</Label>
                <div className="space-y-2 mt-1">
                  {headers.map((h, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2">
                      <Input className="col-span-2" value={h.key} placeholder="Header-Name" onChange={(e) => updateHeader(idx, { key: e.target.value })} />
                      <Input className="col-span-3" value={h.value} placeholder="value" onChange={(e) => updateHeader(idx, { value: e.target.value })} />
                      <div className="col-span-5 text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeHeader(idx)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addHeader}><Plus className="h-4 w-4 mr-1" /> Add header</Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Max retries</Label>
                  <Input type="number" value={retry.maxRetries ?? 3} onChange={(e) => setRetry((r) => ({ ...r, maxRetries: Number(e.target.value || 0) }))} />
                </div>
                <div>
                  <Label className="text-xs">Retry delay (s)</Label>
                  <Input type="number" value={retry.retryDelay ?? 2} onChange={(e) => setRetry((r) => ({ ...r, retryDelay: Number(e.target.value || 0) }))} />
                </div>
                <div>
                  <Label className="text-xs">Backoff</Label>
                  <Input type="number" step="0.1" value={retry.backoffMultiplier ?? 2} onChange={(e) => setRetry((r) => ({ ...r, backoffMultiplier: Number(e.target.value || 0) }))} />
                </div>
              </div>

              <div className="text-right">
                <Button className="btn-gradient" disabled={!canCreate || createLoading} onClick={createEndpoint}>
                  {createLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  {t('manager.createCta', { default: 'Create endpoint' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('manager.testSection', { default: 'Send Test Event' })}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-xs">Event</Label>
                <Select value={testEvent} onValueChange={setTestEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([...COMMON_EVENTS, ...selectedEvents])).map((ev) => (
                      <SelectItem key={ev} value={ev}>{ev}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tenant</Label>
                <Input value={testTenantId} onChange={(e) => setTestTenantId(e.target.value)} placeholder="current" />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Payload (JSON)</Label>
                <Textarea value={testPayload} onChange={(e) => setTestPayload(e.target.value)} className="min-h-[90px] font-mono" />
              </div>
              <div className="md:col-span-3 text-right">
                <Button variant="outline" onClick={() => setTestPayload('{"message":"Hello from admin UI"}')}>{t('common.reset')}</Button>
                <Button className="ml-2 btn-gradient" disabled={testLoading} onClick={sendTest}>
                  {testLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {t('manager.sendTest', { default: 'Send Test' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndpointRow({ endpoint, onDelete, onCopy, setTestEvent }: { endpoint: WebhookEndpoint; onDelete: () => void; onCopy: (t: string) => void; setTestEvent: (ev: string) => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [deliveries, setDeliveries] = React.useState<Array<{ id: string; status: string; eventType: string; responseStatus?: number | null; timestamp: string; completedAt?: string | null; errorMessage?: string | null }>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await webhooksApi.listDeliveries(endpoint.id, 20);
      setDeliveries(Array.isArray(data) ? data : []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (expanded) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const statusBadge = (status: string) => {
    const cls = status === 'success' ? 'badge-success' : status === 'failed' ? 'badge-danger' : 'badge-info';
    return <span className={`chip ${cls}`}>{status}</span>;
  };

  return (
    <div className="p-3 border rounded-md">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{endpoint.name}</div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Link2 className="h-3 w-3" /> {endpoint.url}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {endpoint.events.map((ev) => (
              <Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!!endpoint.secret && (
            <Button variant="outline" size="sm" onClick={() => onCopy(endpoint.secret || '')}>
              <Copy className="h-4 w-4 mr-1" />
              Secret
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onCopy(endpoint.url)}>
            <Copy className="h-4 w-4 mr-1" />
            URL
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setTestEvent(endpoint.events[0] || 'conversation.message.received'); }}>
            <TestTube className="h-4 w-4 mr-1" />
            Test
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide' : 'Deliveries'}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t pt-3">
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : deliveries.length === 0 ? (
            <div className="text-xs text-muted-foreground">No recent deliveries</div>
          ) : (
            <div className="space-y-2">
              {deliveries.map((d) => (
                <div key={d.id} className="text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusBadge(d.status)}
                    <span className="truncate">{d.eventType}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {d.responseStatus ?? '-'} • {new Date(d.completedAt || d.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


