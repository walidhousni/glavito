'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { normalizeNodeType, getNodeLabel, getNodeDescription } from '@/lib/workflows/node-type-mapping';
import { TemplateMessageForm } from './node-forms/TemplateMessageForm';
import { SendMessageForm } from './node-forms/SendMessageForm';
import { TicketCreateForm } from './node-forms/TicketCreateForm';
import { TicketUpdateForm } from './node-forms/TicketUpdateForm';
import { TicketAssignForm } from './node-forms/TicketAssignForm';
import { TicketCloseForm } from './node-forms/TicketCloseForm';
import { ConditionForm } from './node-forms/ConditionForm';
import { DelayForm } from './node-forms/DelayForm';
import { ContextVariableHelper } from './node-forms/shared/ContextVariableHelper';
import { NodePreview } from './node-forms/shared/NodePreview';

type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data?: { label?: string; [k: string]: unknown };
};

export function NodeInspector({ node, onChange }: { node: FlowNode | null; onChange: (patch: Partial<FlowNode>) => void }) {

  if (!node) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Inspector</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Select a node to edit its properties</CardContent>
      </Card>
    );
  }

  const label = node?.data?.label || '';
  const rawType = node?.type || 'default';
  const normalizedType = normalizeNodeType(rawType);
  const userFriendlyLabel = getNodeLabel(normalizedType);
  const description = getNodeDescription(normalizedType);
  const cfg = (node?.data || {}) as Record<string, unknown>;
  const outputs = (Array.isArray((cfg.outputs as any)) ? (cfg.outputs as string[]) : []) as string[];

  // Helper to update node data
  const updateNodeData = (updates: Partial<Record<string, unknown>>) => {
    onChange({
      data: {
        ...node.data,
        ...updates
      } as any
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span>Node Inspector</span>
          <Badge variant="secondary" className="text-xs font-normal">
            {userFriendlyLabel}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
            <TabsTrigger value="io">I/O</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3">
            <NodePreview nodeType={normalizedType} config={cfg} />
            <div className="space-y-1">
              <Label className="text-xs">Display Label</Label>
              <Input
                value={String(label)}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                placeholder={userFriendlyLabel}
              />
              <p className="text-xs text-muted-foreground">The name shown on the canvas</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Node Type</Label>
              <Input
                value={userFriendlyLabel}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Type: {rawType}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">X</Label>
                <Input
                  type="number"
                  value={Number(node.position?.x || 0)}
                  onChange={(e) => onChange({ position: { x: parseInt(e.target.value || '0', 10), y: node.position?.y || 0 } })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y</Label>
                <Input
                  type="number"
                  value={Number(node.position?.y || 0)}
                  onChange={(e) => onChange({ position: { x: node.position?.x || 0, y: parseInt(e.target.value || '0', 10) } })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-3">
            {/* Type-specific configuration editors */}
            {normalizedType === 'condition' && (
              <ConditionForm config={cfg} onChange={updateNodeData} />
            )}

            {normalizedType === 'delay' && (
              <DelayForm config={cfg} onChange={updateNodeData} />
            )}

            {(normalizedType === 'api_call' || rawType === 'http') && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    placeholder="https://api.example.com/endpoint"
                    value={String((cfg.url as string) || '')}
                    onChange={(e) => updateNodeData({ url: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Method</Label>
                    <Select
                      value={String((cfg.method as string) || 'POST').toUpperCase()}
                      onValueChange={(v) => updateNodeData({ method: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Timeout (ms)</Label>
                    <Input
                      type="number"
                      value={Number((cfg.timeoutMs as number) || 10000)}
                      onChange={(e) => updateNodeData({ timeoutMs: parseInt(e.target.value || '0', 10) })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Headers (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs min-h-[90px]"
                    value={JSON.stringify((cfg.headers as any) || {}, null, 2)}
                    onChange={(e) => { try { updateNodeData({ headers: JSON.parse(e.target.value || '{}') }); } catch { /* ignore */ } }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Body (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs min-h-[120px]"
                    value={JSON.stringify((cfg.body as any) || {}, null, 2)}
                    onChange={(e) => { try { updateNodeData({ body: JSON.parse(e.target.value || '{}') }); } catch { /* ignore */ } }}
                  />
                </div>
              </div>
            )}

            {(normalizedType === 'send_email' || normalizedType === 'send-notification' || normalizedType === 'send-whatsapp' || normalizedType === 'send-instagram') && (
              <SendMessageForm config={cfg} onChange={updateNodeData} />
            )}

            {normalizedType === 'template-message' && (
              <TemplateMessageForm config={cfg} onChange={updateNodeData} />
            )}

            {/* Ticket Node Forms */}
            {normalizedType === 'ticket-create' && (
              <TicketCreateForm config={cfg} onChange={updateNodeData} />
            )}

            {normalizedType === 'ticket-update' && (
              <TicketUpdateForm config={cfg} onChange={updateNodeData} />
            )}

            {normalizedType === 'ticket-assign' && (
              <TicketAssignForm config={cfg} onChange={updateNodeData} />
            )}

            {normalizedType === 'ticket-close' && (
              <TicketCloseForm config={cfg} onChange={updateNodeData} />
            )}

            {normalizedType === 'log-event' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Event Type</Label>
                    <Input
                      placeholder="event_name"
                      value={String((cfg.eventType as string) || '')}
                      onChange={(e) => updateNodeData({ eventType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Level</Label>
                    <Select
                      value={String((cfg.logLevel as string) || 'info')}
                      onValueChange={(v) => updateNodeData({ logLevel: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debug">debug</SelectItem>
                        <SelectItem value="info">info</SelectItem>
                        <SelectItem value="warn">warn</SelectItem>
                        <SelectItem value="error">error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Message</Label>
                  <Input
                    placeholder="Message"
                    value={String((cfg.message as string) || '')}
                    onChange={(e) => updateNodeData({ message: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Metadata (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs min-h-[90px]"
                    value={JSON.stringify((cfg.metadata as any) || {}, null, 2)}
                    onChange={(e) => { try { updateNodeData({ metadata: JSON.parse(e.target.value || '{}') }); } catch { /* ignore */ } }}
                  />
                </div>
              </div>
            )}

            {/* AI Decision Node */}
            {(normalizedType === 'ai_decision' || normalizedType === 'ai-analysis') && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Content to Analyze</Label>
                  <Textarea
                    className="text-xs min-h-[80px]"
                    placeholder="{{messageContent}} or direct text"
                    value={String((cfg.content as string) || '')}
                    onChange={(e) => updateNodeData({ content: e.target.value })}
                  />
                  <div className="text-[11px] text-muted-foreground">Use {'{{variable}}'} for dynamic content</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Analysis Types (comma-separated)</Label>
                  <Input
                    placeholder="intent_classification,sentiment_analysis,urgency_detection"
                    value={((cfg.analysisTypes as string[]) || []).join(',')}
                    onChange={(e) => updateNodeData({ analysisTypes: e.target.value.split(',').map((x: string) => x.trim()) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default Output Path</Label>
                  <Input
                    placeholder="neutral"
                    value={String((cfg.defaultOutput as string) || 'neutral')}
                    onChange={(e) => updateNodeData({ defaultOutput: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* AI Agent Node */}
            {normalizedType === 'ai_agent' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Agent ID</Label>
                    <Input
                      placeholder="agent_123"
                      value={String((cfg.agentId as string) || '')}
                      onChange={(e) => updateNodeData({ agentId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mode</Label>
                    <Select
                      value={String((cfg.mode as string) || 'draft')}
                      onValueChange={(v) => updateNodeData({ mode: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Min Confidence</Label>
                    <Input
                      type="number"
                      step="0.05"
                      placeholder="0.7"
                      value={String((cfg.minConfidence as number) ?? '')}
                      onChange={(e) => updateNodeData({ minConfidence: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Channel Type</Label>
                    <Select
                      value={String((cfg.channelType as string) || '')}
                      onValueChange={(v) => updateNodeData({ channelType: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue placeholder="auto" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Seed Content (optional)</Label>
                  <Textarea
                    className="min-h-[80px]"
                    placeholder="{{messageContent}}"
                    value={String((cfg.content as string) || '')}
                    onChange={(e) => updateNodeData({ content: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* AI Route Node */}
            {normalizedType === 'ai_route' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Intent Map (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs min-h-[120px]"
                    placeholder='{"complaint":"complaint","question":"question","request":"request"}'
                    value={JSON.stringify((cfg.intentMap as any) || {}, null, 2)}
                    onChange={(e) => { try { updateNodeData({ intentMap: JSON.parse(e.target.value || '{}') }); } catch { /* ignore */ } }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default Output</Label>
                  <Input
                    placeholder="neutral"
                    value={String((cfg.defaultOutput as string) || 'neutral')}
                    onChange={(e) => updateNodeData({ defaultOutput: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* AI Tool Call Node */}
            {normalizedType === 'ai_tool_call' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tool</Label>
                    <Select
                      value={String((cfg.tool as string) || 'order')}
                      onValueChange={(v) => updateNodeData({ tool: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="order">Order</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parameters (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs min-h-[120px]"
                    placeholder='{"sku":"SKU-123","quantity":1}'
                    value={JSON.stringify((cfg.params as any) || {}, null, 2)}
                    onChange={(e) => { try { updateNodeData({ params: JSON.parse(e.target.value || '{}') }); } catch { /* ignore */ } }}
                  />
                </div>
              </div>
            )}

            {/* AI Guardrail Node */}
            {normalizedType === 'ai_guardrail' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Min Confidence</Label>
                    <Input
                      type="number"
                      step="0.05"
                      placeholder="0.7"
                      value={String((cfg.minConfidence as number) ?? '')}
                      onChange={(e) => updateNodeData({ minConfidence: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Profanity Filter</Label>
                    <Select
                      value={String((cfg.profanityFilter as boolean) ? 'on' : 'off')}
                      onValueChange={(v) => updateNodeData({ profanityFilter: v === 'on' })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="on">On</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Allowed Channels</Label>
                  <div className="flex flex-wrap gap-2">
                    {['whatsapp','instagram','email','web'].map((c) => {
                      const current = Array.isArray(cfg.allowedChannels) ? (cfg.allowedChannels as string[]) : []
                      const next = current.includes(c) ? current.filter(x => x !== c) : current.concat(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`text-[11px] px-2 py-1 rounded border ${current.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                          onClick={() => updateNodeData({ allowedChannels: next })}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">Outputs: allowed, blocked</div>
              </div>
            )}

            {/* Churn Risk Node */}
            {normalizedType === 'churn_risk_check' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={Boolean((cfg.autoCreateCampaign as boolean))}
                    onChange={(e) => updateNodeData({ autoCreateCampaign: e.target.checked })}
                  />
                  <Label className="text-xs">Auto-create Retention Campaign</Label>
                </div>
                <div className="text-xs text-muted-foreground">
                  Output paths: low, medium, high, critical
                </div>
              </div>
            )}

            {/* Segment Check Node */}
            {normalizedType === 'segment_check' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Segment IDs (comma-separated)</Label>
                  <Input
                    placeholder="segment_id_1,segment_id_2"
                    value={((cfg.segmentIds as string[]) || []).join(',')}
                    onChange={(e) => updateNodeData({ segmentIds: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Or Segment Names (comma-separated)</Label>
                  <Input
                    placeholder="VIP,High Value,At Risk"
                    value={((cfg.segmentNames as string[]) || []).join(',')}
                    onChange={(e) => updateNodeData({ segmentNames: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) })}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Output paths: in_segment, not_in_segment
                </div>
              </div>
            )}

            {/* Analytics Tracker Node */}
            {normalizedType === 'track_event' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Event Type</Label>
                  <Input
                    placeholder="workflow.milestone"
                    value={String((cfg.eventType as string) || 'workflow.custom_event')}
                    onChange={(e) => updateNodeData({ eventType: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Data (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs min-h-[80px]"
                    placeholder='{"action": "{{action}}", "value": 100}'
                    value={JSON.stringify((cfg.data as any) || {}, null, 2)}
                    onChange={(e) => { try { updateNodeData({ data: JSON.parse(e.target.value || '{}') }); } catch { /* ignore */ } }}
                  />
                </div>
              </div>
            )}

            {/* Journey Tracker Node */}
            {normalizedType === 'journey_checkpoint' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Stage Name (optional)</Label>
                  <Input
                    placeholder="Onboarding, Activation, etc."
                    value={String((cfg.stageName as string) || '')}
                    onChange={(e) => updateNodeData({ stageName: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={Boolean((cfg.getRecommendations as boolean)) !== false}
                    onChange={(e) => updateNodeData({ getRecommendations: e.target.checked })}
                  />
                  <Label className="text-xs">Get Journey Recommendations</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={Boolean((cfg.routeByStage as boolean))}
                    onChange={(e) => updateNodeData({ routeByStage: e.target.checked })}
                  />
                  <Label className="text-xs">Route by Journey Stage</Label>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="io" className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Outputs</Label>
              <div className="flex flex-wrap gap-1">
                {outputs.length === 0 && (
                  <span className="text-xs text-muted-foreground">No outputs</span>
                )}
                {outputs.map((o) => (
                  <Badge key={o} variant="secondary" className="text-xs">{o}</Badge>
                ))}
              </div>
            </div>
            <ContextVariableHelper className="mt-4" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


