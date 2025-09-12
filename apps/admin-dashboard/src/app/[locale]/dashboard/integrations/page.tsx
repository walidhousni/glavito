'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useIntegrationsStore } from '@/lib/store/integrations-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function IntegrationsPage() {
  const t = useTranslations('integrations');
  const {
    statuses,
    connectors,
    isLoading,
    error,
    fetchStatuses,
    upsertStatus,
    fetchConnectors,
    manualSync,
    disableConnector,
    // new
    docsByProvider,
    fetchDocs,
    getAuthorizeUrl,
    mappingsByProvider,
    fetchMappings,
    upsertMapping,
    deleteMapping,
  } = useIntegrationsStore();

  const [docsOpenFor, setDocsOpenFor] = useState<string | null>(null);
  const [mappingsOpenFor, setMappingsOpenFor] = useState<string | null>(null);
  const [newMapping, setNewMapping] = useState<{ sourceEntity: string; targetEntity?: string; direction: 'inbound' | 'outbound' | 'both'; mappingsJson: string; id?: string }>({ sourceEntity: 'customer', targetEntity: '', direction: 'both', mappingsJson: '{\n  "email": "Email",\n  "firstName": "FirstName"\n}' });

  useEffect(() => {
    fetchStatuses();
    fetchConnectors();
  }, [fetchStatuses, fetchConnectors]);

  const openDocs = async (provider: string) => {
    try {
      await fetchDocs(provider);
      setDocsOpenFor(provider);
    } catch {}
  };

  const openMappings = async (provider: string) => {
    try {
      await fetchMappings(provider);
      setMappingsOpenFor(provider);
    } catch {}
  };

  const docs = useMemo(() => (docsByProvider && docsOpenFor ? docsByProvider[docsOpenFor] : undefined), [docsByProvider, docsOpenFor]);
  const mappings = useMemo(() => (mappingsByProvider && mappingsOpenFor ? mappingsByProvider[mappingsOpenFor] || [] : []), [mappingsByProvider, mappingsOpenFor]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'badge-success';
      case 'error':
        return 'badge-danger';
      case 'disabled':
        return 'badge-info';
      default:
        return 'badge-warning';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => fetchStatuses()}>{t('reload')}</Button>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {isLoading ? (
        <p>{t('loading')}</p>
      ) : statuses.length === 0 ? (
        <p>{t('empty')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statuses.map((s) => (
            <Card key={s.id} className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{s.integrationType}</span>
                  <Badge className={statusColor(s.status)}>{s.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {s.errorMessage ? s.errorMessage : t('noErrors')}
                </div>
                <div className="flex gap-2">
                  {s.status !== 'connected' && (
                    <Button size="sm" onClick={() => upsertStatus({ type: s.integrationType, status: 'connected' })}>
                      {t('actions.connect')}
                    </Button>
                  )}
                  {s.status === 'connected' && (
                    <Button size="sm" variant="outline" onClick={() => upsertStatus({ type: s.integrationType, status: 'disabled' })}>
                      {t('actions.disable')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Connectors</h2>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : connectors.length === 0 ? (
          <p>{t('empty')}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectors.map((c) => (
              <Card key={c.id} className="glass-card connector-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{c.provider}</span>
                    <Badge className={statusColor(c.status)}>{c.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {c.lastError ? c.lastError : t('noErrors')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">Sync</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => manualSync(c.provider, 'customers')}>Customers</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => manualSync(c.provider, 'leads')}>Leads</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => manualSync(c.provider, 'deals')}>Deals</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button size="sm" variant="outline" onClick={() => openDocs(c.provider)}>Docs</Button>
                    <Button size="sm" variant="outline" onClick={() => openMappings(c.provider)}>Mappings</Button>
                    {c.status !== 'connected' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const redirectUri = window.location.origin + '/api/oauth/return';
                            const url = await getAuthorizeUrl(c.provider, redirectUri);
                            if (url) window.open(url, '_blank');
                          } catch {}
                        }}
                      >Authorize</Button>
                    )}
                    {c.status === 'connected' && (
                      <Button size="sm" variant="destructive" onClick={() => disableConnector(c.provider)}>Disable</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Docs Dialog */}
      <Dialog open={!!docsOpenFor} onOpenChange={(open) => setDocsOpenFor(open ? docsOpenFor : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{docs?.name || docsOpenFor}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{docs?.description}</p>
            {docs?.setup?.length ? (
              <div>
                <h4 className="text-sm font-medium mb-2">Setup</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {docs.setup.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              </div>
            ) : null}
            {docs?.env?.length ? (
              <div>
                <h4 className="text-sm font-medium mb-2">Environment Variables</h4>
                <div className="flex flex-wrap gap-2">
                  {docs.env.map((e) => (<span key={e} className="chip chip-muted">{e}</span>))}
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mappings Dialog */}
      <Dialog open={!!mappingsOpenFor} onOpenChange={(open) => setMappingsOpenFor(open ? mappingsOpenFor : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Field Mappings {mappingsOpenFor ? `- ${mappingsOpenFor}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">Add or Update Mapping</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Source Entity</Label>
                  <Input value={newMapping.sourceEntity} onChange={(e) => setNewMapping((p) => ({ ...p, sourceEntity: e.target.value }))} placeholder="customer | lead | deal | product" />
                </div>
                <div>
                  <Label className="text-xs">Target Entity</Label>
                  <Input value={newMapping.targetEntity || ''} onChange={(e) => setNewMapping((p) => ({ ...p, targetEntity: e.target.value }))} placeholder="optional" />
                </div>
                <div>
                  <Label className="text-xs">Direction</Label>
                  <Input value={newMapping.direction} onChange={(e) => setNewMapping((p) => ({ ...p, direction: (e.target.value as any) }))} placeholder="inbound | outbound | both" />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs">Mappings (JSON)</Label>
                <Textarea rows={6} value={newMapping.mappingsJson} onChange={(e) => setNewMapping((p) => ({ ...p, mappingsJson: e.target.value }))} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={async () => {
                  if (!mappingsOpenFor) return;
                  try {
                    const body = {
                      id: newMapping.id,
                      sourceEntity: newMapping.sourceEntity,
                      targetEntity: newMapping.targetEntity || undefined,
                      direction: newMapping.direction,
                      mappings: JSON.parse(newMapping.mappingsJson || '{}'),
                    } as any;
                    await upsertMapping(mappingsOpenFor, body);
                    setNewMapping({ sourceEntity: 'customer', targetEntity: '', direction: 'both', mappingsJson: '{\n  "email": "Email"\n}' });
                  } catch (e) {
                    // ignore
                  }
                }}>Save Mapping</Button>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Mappings</h4>
              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mappings yet</p>
              ) : (
                <div className="space-y-2">
                  {mappings.map((m) => (
                    <div key={m.id} className="flex items-start justify-between border rounded-lg p-3">
                      <div className="text-sm">
                        <div className="font-medium">{m.sourceEntity} → {m.targetEntity || 'remote'}</div>
                        <div className="text-muted-foreground text-xs">{m.direction}</div>
                        <pre className="text-xs mt-2 whitespace-pre-wrap break-all bg-muted p-2 rounded">{JSON.stringify(m.mappings, null, 2)}</pre>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setNewMapping({ id: m.id, sourceEntity: m.sourceEntity, targetEntity: m.targetEntity || '', direction: m.direction as any, mappingsJson: JSON.stringify(m.mappings, null, 2) })}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMapping(mappingsOpenFor!, m.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


