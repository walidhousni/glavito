"use client"
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { channelsApi, WhatsAppTemplate } from '@/lib/api/channels-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Send, Plus } from 'lucide-react'
import { CreateWhatsAppTemplateDialog } from '@/components/channels/create-whatsapp-template-dialog'

export default function WhatsAppAutomationPage() {
  const t = useTranslations('whatsapp')
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [to, setTo] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templateParams, setTemplateParams] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [openCreateDialog, setOpenCreateDialog] = useState(false)

  const load = async (force = false) => {
    setLoading(true)
    try {
      const list = await channelsApi.listWhatsAppTemplates(force)
      setTemplates(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(false) }, [])

  const sendTest = async () => {
    try {
      setResult(null)
      const params = templateParams ? JSON.parse(templateParams) : undefined
      await channelsApi.testSendWhatsAppTemplate({ to, templateId: templateId || undefined, templateParams: params })
      setResult(t('messages.sentSuccessfully'))
    } catch (e: any) {
      setResult(e?.message || t('messages.failedToSend'))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <div className="flex gap-2">
        <Button variant="outline" onClick={() => load(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('refreshTemplates')}
        </Button>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Template
          </Button>
        </div>
      </div>

      <CreateWhatsAppTemplateDialog
        open={openCreateDialog}
        onOpenChange={setOpenCreateDialog}
        onSuccess={() => {
          load(true); // Refresh templates after creation
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('testSendTemplate')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <Input placeholder={t('placeholders.recipientPhone')} value={to} onChange={(e) => setTo(e.target.value)} />
            <Input placeholder={t('placeholders.templateId')} value={templateId} onChange={(e) => setTemplateId(e.target.value)} list="wa-templates" />
            <datalist id="wa-templates">
              {templates.map(template => (<option key={template.name} value={template.name}>{template.name}</option>))}
            </datalist>
          </div>
          <Textarea placeholder={t('placeholders.templateParams')} value={templateParams} onChange={(e) => setTemplateParams(e.target.value)} />
          <div className="flex gap-3">
            <Button onClick={sendTest} disabled={!to}>
              <Send className="h-4 w-4 mr-2" /> {t('sendTest')}
            </Button>
            {result && <Badge variant="outline">{result}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('templates.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.name} className="border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{template.name}</div>
                    <Badge variant="outline">{template.status || t('templates.unknown')}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">{template.language} • {template.category}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {template.previewBody || t('templates.noPreview')}
                  </div>
                  {template.variables && template.variables.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">{t('templates.vars')}: {template.variables.join(', ')}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


