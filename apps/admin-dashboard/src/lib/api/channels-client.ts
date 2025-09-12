import api from './config'

export interface WhatsAppTemplateItem {
  name: string
  category?: string
  language?: string
  status?: string
  previewBody?: string
  variables?: string[]
}

export class ChannelsApiClient {
  async list() {
    const res = await api.get('/channels')
    return (res as any)?.data?.data ?? res.data
  }

  async listWhatsAppTemplates(forceRefresh = false): Promise<WhatsAppTemplateItem[]> {
    if (forceRefresh) {
      await api.post('/channels/whatsapp/templates/refresh')
    }
    const res = await api.get('/channels/whatsapp/templates')
    const data = (res as any)?.data?.data ?? res.data
    return Array.isArray(data) ? data as WhatsAppTemplateItem[] : []
  }
}

export const channelsApi = new ChannelsApiClient()


