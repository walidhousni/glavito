import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MediaAnalysisService {
  private readonly logger = new Logger(MediaAnalysisService.name)
  private readonly apiUrl: string | undefined
  private readonly apiKey: string | undefined

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>('AI_MEDIA_API_URL')
    this.apiKey = this.config.get<string>('AI_MEDIA_API_KEY')
  }

  async analyzeImageFromUrl(url: string): Promise<{ description?: string }> {
    try {
      const res = await fetch(url)
      const buffer = await res.arrayBuffer()
      const mimeType = res.headers.get('content-type') || 'image/jpeg'
      return await this.analyzeImage(Buffer.from(buffer), mimeType)
    } catch (e) {
      this.logger.warn('analyzeImageFromUrl failed', (e as any)?.message)
      return {}
    }
  }

  async analyzePdfFromUrl(url: string): Promise<{ summary?: string; pages?: number }> {
    try {
      const res = await fetch(url)
      const buffer = await res.arrayBuffer()
      return await this.analyzePdf(Buffer.from(buffer))
    } catch (e) {
      this.logger.warn('analyzePdfFromUrl failed', (e as any)?.message)
      return {}
    }
  }

  async analyzeImage(buffer: Buffer, mimeType?: string): Promise<{ description?: string }> {
    try {
      if (this.apiUrl && this.apiKey) {
        const payload = {
          type: 'image',
          mimeType: mimeType || 'image/jpeg',
          data: buffer.toString('base64')
        }
        const res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        return { description: data?.description || data?.alt || data?.caption }
      }
      // Fallback heuristic description
      return { description: `Image received (${mimeType || 'image'}, ${buffer.byteLength} bytes)` }
    } catch (e) {
      this.logger.warn('analyzeImage failed', (e as any)?.message)
      return {}
    }
  }

  async analyzePdf(buffer: Buffer): Promise<{ summary?: string; pages?: number }> {
    try {
      if (this.apiUrl && this.apiKey) {
        const payload = { type: 'pdf', data: buffer.toString('base64') }
        const res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        return { summary: data?.summary, pages: data?.pages }
      }
      // Fallback simple metadata
      return { summary: `PDF document (${buffer.byteLength} bytes)` }
    } catch (e) {
      this.logger.warn('analyzePdf failed', (e as any)?.message)
      return {}
    }
  }
}


