'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { botsApi, type BotAgentDto, type BotBindingDto } from '@/lib/api/bots-client'

export function BotsPanel() {
  const t = useTranslations('settings.bots')
  const [agents, setAgents] = React.useState<BotAgentDto[]>([])
  const [bindings, setBindings] = React.useState<BotBindingDto[]>([])
  const [loading, setLoading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState<{ name: string; description?: string; operatingMode: 'draft'|'auto'; minConfidence: string; allowedChannels: string[] }>({ name: '', description: '', operatingMode: 'draft', minConfidence: '0.7', allowedChannels: ['whatsapp','instagram','email'] })
  const [bindForm, setBindForm] = React.useState<{ agentId?: string; channelId: string; channelType: string } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [a, b] = await Promise.all([botsApi.listAgents(), botsApi.listBindings().catch(() => [])])
        if (!cancelled) { setAgents(a); setBindings(b) }
      } catch { if (!cancelled) { setAgents([]); setBindings([]) } } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  async function createAgent() {
    if (!form.name.trim()) return
    try {
      setCreating(true)
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        operatingMode: form.operatingMode,
        minConfidence: Number(form.minConfidence) || 0.7,
        allowedChannels: form.allowedChannels,
      }
      const created = await botsApi.createAgent(payload)
      setAgents(prev => [created, ...prev])
      setForm({ name: '', description: '', operatingMode: 'draft', minConfidence: '0.7', allowedChannels: ['whatsapp','instagram','email'] })
    } catch { /* noop */ } finally { setCreating(false) }
  }

  async function toggleActive(agent: BotAgentDto) {
    try {
      const updated = await botsApi.activateAgent(agent.id, !agent.isActive)
      setAgents(prev => prev.map(a => a.id === agent.id ? updated : a))
    } catch { /* noop */ }
  }

  async function bindAgent() {
    if (!bindForm?.agentId || !bindForm.channelId || !bindForm.channelType) return
    try {
      const created = await botsApi.bindToChannel({ agentId: bindForm.agentId, channelId: bindForm.channelId, channelType: bindForm.channelType, isEnabled: true })
      setBindings(prev => [created, ...prev])
      setBindForm(null)
    } catch { /* noop */ }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title', { fallback: 'Bots' })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Agent */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>{t('fields.name', { fallback: 'Name' })}</Label>
            <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder={t('placeholders.name', { fallback: 'Support Assistant' })} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>{t('fields.description', { fallback: 'Description' })}</Label>
            <Input value={form.description || ''} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder={t('placeholders.description', { fallback: 'Handles level-1 inquiries across channels' })} />
          </div>
          <div className="space-y-1">
            <Label>{t('fields.mode', { fallback: 'Mode' })}</Label>
            <Select value={form.operatingMode} onValueChange={(v) => setForm(prev => ({ ...prev, operatingMode: (v as 'draft'|'auto') }))}>
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.mode', { fallback: 'Mode' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('modes.draft', { fallback: 'Draft' })}</SelectItem>
                <SelectItem value="auto">{t('modes.auto', { fallback: 'Auto' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('fields.minConfidence', { fallback: 'Min Confidence' })}</Label>
            <Input value={form.minConfidence} onChange={(e) => setForm(prev => ({ ...prev, minConfidence: e.target.value }))} placeholder={t('placeholders.minConfidence', { fallback: '0.7' })} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>{t('fields.channels', { fallback: 'Allowed Channels' })}</Label>
            <div className="flex flex-wrap gap-2">
              {['whatsapp','instagram','email','web'].map((c) => (
                <button key={c} className={`text-xs px-2 py-1 rounded border ${form.allowedChannels.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`} onClick={() => setForm(prev => ({ ...prev, allowedChannels: prev.allowedChannels.includes(c) ? prev.allowedChannels.filter(x => x !== c) : prev.allowedChannels.concat(c) }))}>
                  {t(`channels.${c}`, { fallback: c })}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={createAgent} disabled={creating || !form.name.trim()}>{creating ? t('actions.creating', { fallback: 'Creating…' }) : t('actions.create', { fallback: 'Create' })}</Button>
          </div>
        </div>

        {/* Agents List */}
        <div className="space-y-3">
          <div className="text-sm font-medium">{t('agents.title', { fallback: 'Agents' })}</div>
          <div className="grid gap-3">
            {agents.map((a) => (
              <div key={a.id} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.name}</span>
                    <Badge variant={a.isActive ? 'default' : 'secondary'}>{a.isActive ? t('labels.active', { fallback: 'Active' }) : t('labels.inactive', { fallback: 'Inactive' })}</Badge>
                    <Badge variant="outline">{t(`modes.${a.operatingMode}`, { fallback: a.operatingMode })}</Badge>
                    <Badge variant="outline">{Math.round((a.minConfidence || 0.7) * 100)}%</Badge>
                  </div>
                  {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  <div className="text-xs text-muted-foreground">{t('labels.channels', { fallback: 'Channels' })}: {(a.allowedChannels || []).map(c => t(`channels.${c}`, { fallback: c })).join(', ')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setBindForm({ agentId: a.id, channelId: '', channelType: 'whatsapp' })}>{t('actions.bind', { fallback: 'Bind' })}</Button>
                  <Button size="sm" onClick={() => toggleActive(a)}>{a.isActive ? t('actions.deactivate', { fallback: 'Deactivate' }) : t('actions.activate', { fallback: 'Activate' })}</Button>
                </div>
              </div>
            ))}
            {(!loading && agents.length === 0) && (
              <div className="text-sm text-muted-foreground">{t('agents.empty', { fallback: 'No agents yet' })}</div>
            )}
          </div>
        </div>

        {/* Bindings */}
        <div className="space-y-3">
          <div className="text-sm font-medium">{t('bindings.title', { fallback: 'Channel Bindings' })}</div>
          <div className="grid gap-3">
            {bindings.map((b) => (
              <div key={b.id} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t(`channels.${b.channelType}`, { fallback: b.channelType })}</Badge>
                    <span className="text-sm">{b.channelId}</span>
                    <Badge variant={b.isEnabled ? 'default' : 'secondary'}>{b.isEnabled ? t('labels.enabled', { fallback: 'Enabled' }) : t('labels.disabled', { fallback: 'Disabled' })}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {(!loading && bindings.length === 0) && (
              <div className="text-sm text-muted-foreground">{t('bindings.empty', { fallback: 'No bindings yet' })}</div>
            )}
          </div>
        </div>

        {/* Bind Dialog (inline simple) */}
        {bindForm && (
          <div className="p-4 border rounded-lg space-y-3">
            <div className="text-sm font-medium">{t('bindings.bindTitle', { fallback: 'Bind Agent to Channel' })}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>{t('fields.channelType', { fallback: 'Channel Type' })}</Label>
                <Select value={bindForm.channelType} onValueChange={(v) => setBindForm(prev => prev ? { ...prev, channelType: v } : prev)}>
                  <SelectTrigger><SelectValue placeholder={t('placeholders.channelType', { fallback: 'Type' })} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">{t('channels.whatsapp', { fallback: 'WhatsApp' })}</SelectItem>
                    <SelectItem value="instagram">{t('channels.instagram', { fallback: 'Instagram' })}</SelectItem>
                    <SelectItem value="email">{t('channels.email', { fallback: 'Email' })}</SelectItem>
                    <SelectItem value="web">{t('channels.web', { fallback: 'Web' })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>{t('fields.channelId', { fallback: 'Channel ID' })}</Label>
                <Input value={bindForm.channelId} onChange={(e) => setBindForm(prev => prev ? { ...prev, channelId: e.target.value } : prev)} placeholder={t('placeholders.channelId', { fallback: 'channel_123' })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={bindAgent}>{t('actions.bindNow', { fallback: 'Bind' })}</Button>
              <Button variant="outline" onClick={() => setBindForm(null)}>{t('actions.cancel', { fallback: 'Cancel' })}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BotsPanel


