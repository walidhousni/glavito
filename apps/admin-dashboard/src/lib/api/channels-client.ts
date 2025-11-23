import api from './config'

export interface WhatsAppTemplate {
  name: string
  category?: string
  language?: string
  status?: string
  previewBody?: string
  variables?: string[]
}

export class ChannelsApiClient {
  async list(): Promise<any[]> {
    const res = await api.get('/channels')
    return ((res as any)?.data?.data ?? res.data) as any[]
  }

  async listWhatsAppTemplates(forceRefresh = false): Promise<WhatsAppTemplate[]> {
    if (forceRefresh) {
      await api.post('/channels/whatsapp/templates/refresh')
    }
    const res = await api.get('/channels/whatsapp/templates')
    const data = (res as any)?.data?.data ?? res.data
    return Array.isArray(data) ? (data as WhatsAppTemplate[]) : []
  }

  async testSendWhatsAppTemplate(payload: { to: string; templateId?: string; templateParams?: Record<string, string>; language?: string }): Promise<any> {
    const res = await api.post('/channels/whatsapp/test-send', payload)
    return (res as any)?.data?.data ?? res.data
  }

  async createWhatsAppTemplate(payload: {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    body: string;
    header?: string;
    footer?: string;
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text?: string;
      url?: string;
      phoneNumber?: string;
    }>;
  }): Promise<{ id: string; name: string; status: string; message?: string }> {
    const res = await api.post('/channels/whatsapp/templates/create', payload)
    return (res as any)?.data?.data ?? res.data
  }
}

export const channelsApi = new ChannelsApiClient()
