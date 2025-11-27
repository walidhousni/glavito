'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { webhooksApi, type WebhookEndpoint, type CreateWebhookEndpointDto } from '@/lib/api/webhooks-client';
import { useTranslations } from 'next-intl';
import { 
  Trash2, Plus, RefreshCw, CheckCircle2, Copy, TestTube, X, AlertTriangle,
  Webhook, Send, Settings, Activity, Globe, Key, Clock, CheckCircle, XCircle,
  Eye, EyeOff
} from 'lucide-react';

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
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [showSecrets, setShowSecrets] = React.useState<Record<string, boolean>>({});

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
    try { 
      await navigator.clipboard.writeText(text); 
      setToast({ type: 'info', msg: 'Copied' }); 
    } catch {
      // Fallback for browsers without clipboard API
      setToast({ type: 'error', msg: 'Copy failed' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] bg-gradient-to-br from-white via-slate-50/30 to-white dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900 border-slate-200/60 dark:border-slate-700/60 shadow-2xl">
        <DialogHeader className="pb-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center shadow-lg border border-blue-200/60 dark:border-blue-800/60">
              <Webhook className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent font-bold">
                {t('manager.title', { default: 'Webhooks Manager' })}
              </div>
              <div className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                Manage webhook endpoints and monitor deliveries
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {toast && (
          <div className={`mb-6 p-4 rounded-xl border backdrop-blur-sm flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300' : toast.type === 'error' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60 text-red-700 dark:text-red-300' : 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-800/40' :
              toast.type === 'error' ? 'bg-red-100 dark:bg-red-800/40' : 
              'bg-blue-100 dark:bg-blue-800/40'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
               toast.type === 'error' ? <XCircle className="h-4 w-4" /> :
               <Activity className="h-4 w-4" />}
            </div>
            <div className="font-medium">{toast.msg}</div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200/60 dark:border-red-800/60 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-800/40 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-red-700 dark:text-red-300 font-medium">{error}</div>
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Endpoints Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {t('manager.endpoints', { default: 'Webhook Endpoints' })}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowCreateForm(!showCreateForm)} 
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Endpoint
                </Button>
              </div>
              
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse mx-auto mb-4" />
                    <div className="text-slate-500 dark:text-slate-400">{t('common.loading')}</div>
                  </div>
                ) : endpoints.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto">
                      <Webhook className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('manager.noEndpoints', { default: 'No endpoints configured' })}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Create your first webhook endpoint to start receiving events
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                    {endpoints.map((ep, index) => (
                      <EndpointRow 
                        key={ep.id} 
                        endpoint={ep} 
                        index={index}
                        onDelete={() => deleteEndpoint(ep.id)} 
                        onCopy={copy} 
                        setTestEvent={(ev) => setTestEvent(ev)}
                        showSecret={showSecrets[ep.id] || false}
                        onToggleSecret={() => setShowSecrets(prev => ({ ...prev, [ep.id]: !prev[ep.id] }))}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {t('manager.create', { default: 'Create New Endpoint' })}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Configure a new webhook endpoint to receive events
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Endpoint Name</Label>
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="My webhook listener" 
                        className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Signing Secret (optional)</Label>
                      <Input 
                        value={secret} 
                        onChange={(e) => setSecret(e.target.value)} 
                        placeholder="webhook_secret_key" 
                        type="password"
                        className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Webhook URL</Label>
                      <Input 
                        value={url} 
                        onChange={(e) => setUrl(e.target.value)} 
                        placeholder="https://example.com/api/webhooks/glavito" 
                        className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Event Types</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {COMMON_EVENTS.map((ev) => (
                          <button 
                            key={ev} 
                            type="button" 
                            onClick={() => toggleEvent(ev)} 
                            className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                              selectedEvents.includes(ev) 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 shadow-sm' 
                                : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {ev}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input 
                        value={customEvent} 
                        onChange={(e) => setCustomEvent(e.target.value)} 
                        placeholder="custom.event.name" 
                        className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                      />
                      <Button type="button" onClick={addCustomEvent} variant="outline">
                        <Plus className="h-4 w-4 mr-2" /> Add Custom
                      </Button>
                    </div>
                    
                    {selectedEvents.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Events</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvents.map((ev) => (
                            <Badge 
                              key={ev} 
                              variant="secondary" 
                              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer transition-colors"
                              onClick={() => toggleEvent(ev)}
                            >
                              {ev}
                              <X className="h-3 w-3 ml-2" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="headers" className="border-slate-200/60 dark:border-slate-700/60">
                      <AccordionTrigger className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Custom Headers ({headers.length})
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-3">
                        {headers.map((h, idx) => (
                          <div key={idx} className="grid grid-cols-5 gap-3 items-center">
                            <Input 
                              className="col-span-2 bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60" 
                              value={h.key} 
                              placeholder="Authorization" 
                              onChange={(e) => updateHeader(idx, { key: e.target.value })} 
                            />
                            <Input 
                              className="col-span-2 bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60" 
                              value={h.value} 
                              placeholder="Bearer token" 
                              onChange={(e) => updateHeader(idx, { value: e.target.value })} 
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => removeHeader(idx)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                          <Plus className="h-4 w-4 mr-2" /> Add Header
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="retry" className="border-slate-200/60 dark:border-slate-700/60">
                      <AccordionTrigger className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Retry Policy
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600 dark:text-slate-400">Max Retries</Label>
                            <Input 
                              type="number" 
                              value={retry.maxRetries ?? 3} 
                              onChange={(e) => setRetry((r) => ({ ...r, maxRetries: Number(e.target.value || 0) }))}
                              className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600 dark:text-slate-400">Delay (seconds)</Label>
                            <Input 
                              type="number" 
                              value={retry.retryDelay ?? 2} 
                              onChange={(e) => setRetry((r) => ({ ...r, retryDelay: Number(e.target.value || 0) }))}
                              className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600 dark:text-slate-400">Backoff Multiplier</Label>
                            <Input 
                              type="number" 
                              step="0.1" 
                              value={retry.backoffMultiplier ?? 2} 
                              onChange={(e) => setRetry((r) => ({ ...r, backoffMultiplier: Number(e.target.value || 0) }))}
                              className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>


                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button 
                      disabled={!canCreate || createLoading} 
                      onClick={createEndpoint}
                      className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {createLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      {t('manager.createCta', { default: 'Create Endpoint' })}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Test Section */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center">
                  <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {t('manager.testSection', { default: 'Test Event Delivery' })}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Send a test event to all configured endpoints
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Event Type</Label>
                  <Select value={testEvent} onValueChange={setTestEvent}>
                    <SelectTrigger className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([...COMMON_EVENTS, ...selectedEvents])).map((ev) => (
                        <SelectItem key={ev} value={ev}>{ev}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tenant ID</Label>
                  <Input 
                    value={testTenantId} 
                    onChange={(e) => setTestTenantId(e.target.value)} 
                    placeholder="current" 
                    className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                  />
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Test Payload (JSON)</Label>
                <Textarea 
                  value={testPayload} 
                  onChange={(e) => setTestPayload(e.target.value)} 
                  className="min-h-[120px] font-mono text-xs bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60" 
                  placeholder='{\n  "message": "Hello from Glavito",\n  "timestamp": "2024-01-01T00:00:00Z",\n  "data": {}\n}'
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setTestPayload('{"message":"Hello from admin UI"}')}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('common.reset', { default: 'Reset' })}
                </Button>
                <Button 
                  disabled={testLoading} 
                  onClick={sendTest}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {testLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {t('manager.sendTest', { default: 'Send Test Event' })}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {t('common.close', { default: 'Close' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndpointRow({ 
  endpoint, 
  index, 
  onDelete, 
  onCopy, 
  setTestEvent, 
  showSecret, 
  onToggleSecret 
}: { 
  endpoint: WebhookEndpoint; 
  index: number;
  onDelete: () => void; 
  onCopy: (t: string) => void; 
  setTestEvent: (ev: string) => void;
  showSecret: boolean;
  onToggleSecret: () => void;
}) {
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

  }, [expanded]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
      case 'failed': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'pending': return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  return (
    <div className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center shadow-sm border border-blue-200/60 dark:border-blue-800/60 flex-shrink-0">
            <Webhook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {endpoint.name}
                </h4>
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                >
                  Active
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Globe className="h-4 w-4" />
                <span className="font-mono truncate">{endpoint.url}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(endpoint.url)}
                  className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {endpoint.events.slice(0, 3).map((ev) => (
                <Badge 
                  key={ev} 
                  variant="secondary" 
                  className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {ev}
                </Badge>
              ))}
              {endpoint.events.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  +{endpoint.events.length - 3} more
                </Badge>
              )}
            </div>
            
            {endpoint.secret && (
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {showSecret ? endpoint.secret : '••••••••••••••••'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleSecret}
                    className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  {showSecret && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCopy(endpoint.secret || '')}
                      className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setTestEvent(endpoint.events[0] || 'conversation.message.received'); }}
            className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Activity className="h-4 w-4 mr-2" />
            {expanded ? 'Hide' : 'Deliveries'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="bg-red-50 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-slate-500" />
            <h5 className="font-medium text-slate-700 dark:text-slate-300">Recent Deliveries</h5>
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              disabled={loading}
              className="h-6 w-6 p-0 ml-auto"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent deliveries</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Webhook deliveries will appear here once events are sent
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries.slice(0, 5).map((delivery) => (
                <div 
                  key={delivery.id} 
                  className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(delivery.status)}`} />
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-0.5 ${getStatusColor(delivery.status)}`}
                    >
                      {delivery.status}
                    </Badge>
                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                      {delivery.eventType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">
                      {delivery.responseStatus ? `${delivery.responseStatus}` : 'Pending'}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(delivery.completedAt || delivery.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {deliveries.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all {deliveries.length} deliveries
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


