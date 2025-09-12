

import { Injectable, Optional } from '@nestjs/common'
import { DatabaseService } from '@glavito/shared-database'
import { FilesService } from '../files/files.service'
// eslint-disable-next-line @nx/enforce-module-boundaries
import { AnalyticsService as SharedAnalyticsService } from '@glavito/shared-analytics'

type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json'

@Injectable()
export class AnalyticsReportingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly files: FilesService,
    @Optional() private readonly analytics?: SharedAnalyticsService,
  ) {}

  async createTemplate(tenantId: string, args: { name: string; category?: string | null; definition: Record<string, unknown> }) {
    return this.db.analyticsReportTemplate.create({
      data: {
        tenantId,
        name: args.name,
        category: args.category || null,
        definition: (args.definition || {}) as any,
        isActive: true,
      },
    })
  }

  async listTemplates(tenantId: string) {
    return this.db.analyticsReportTemplate.findMany({ where: { tenantId, isActive: true }, orderBy: { updatedAt: 'desc' } })
  }

  async deleteTemplate(tenantId: string, id: string) {
    const tpl = await this.db.analyticsReportTemplate.findFirst({ where: { id, tenantId } })
    if (!tpl) return { success: false }
    await this.db.analyticsReportTemplate.delete({ where: { id } })
    return { success: true }
  }

  async requestExport(tenantId: string, args: { type: 'dashboard' | 'metric' | 'survey'; sourceId?: string; templateId?: string; format: ExportFormat; parameters?: Record<string, unknown> }) {
    const job = await this.db.analyticsExportJob.create({
      data: {
        tenantId,
        type: args.type,
        sourceId: args.sourceId || null,
        templateId: args.templateId || null,
        format: args.format,
        status: 'pending',
      },
    })

    try {
      const buffer = await this.generateReportBuffer(tenantId, args)
      const contentType = this.getContentType(args.format)
      const saved = await this.files.saveBuffer(buffer, {
        folder: 'analytics/exports',
        filename: `${job.id}.${args.format === 'excel' ? 'xlsx' : args.format}`,
        contentType,
      })

      await this.db.analyticsExportJob.update({ where: { id: job.id }, data: { status: 'completed', fileUrl: saved.url, completedAt: new Date() } })
      await this.db.analyticsReport.create({
        data: {
          tenantId,
          templateId: args.templateId || null,
          name: `${args.type}-${new Date().toISOString()}`,
          parameters: (args.parameters || {}) as any,
          format: args.format,
          status: 'completed',
          fileUrl: saved.url,
          completedAt: new Date(),
        },
      })

      return await this.db.analyticsExportJob.findUnique({ where: { id: job.id } })
    } catch (e) {
      await this.db.analyticsExportJob.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: e instanceof Error ? e.message : String(e) } })
      return await this.db.analyticsExportJob.findUnique({ where: { id: job.id } })
    }
  }

  async listExports(tenantId: string) {
    return this.db.analyticsExportJob.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  }

  async getExportById(tenantId: string, id: string) {
    const job = await this.db.analyticsExportJob.findFirst({ where: { id, tenantId } })
    return job || null
  }

  private async generateReportBuffer(tenantId: string, args: { type: 'dashboard' | 'metric' | 'survey'; sourceId?: string; format: ExportFormat; templateId?: string; parameters?: Record<string, unknown> }) {
    // Prefer shared analytics service if available; otherwise return JSON buffer
    try {
      if (this.analytics && typeof (this.analytics as any).generateReport === 'function') {
        return await (this.analytics as any).generateReport(tenantId, args.type, args.sourceId || '', args.format)
      }
    } catch {
      // fallback to JSON
    }
    const fallback = { tenantId, type: args.type, sourceId: args.sourceId || null, templateId: args.templateId || null, parameters: args.parameters || {}, generatedAt: new Date().toISOString() }
    if (args.format === 'json') return Buffer.from(JSON.stringify(fallback, null, 2))
    if (args.format === 'csv') return Buffer.from('key,value\nformat,fallback\n')
    if (args.format === 'excel') return Buffer.from('EXCEL_PLACEHOLDER')
    return Buffer.from('PDF_PLACEHOLDER')
  }

  private getContentType(format: ExportFormat) {
    switch (format) {
      case 'json':
        return 'application/json'
      case 'csv':
        return 'text/csv'
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case 'pdf':
      default:
        return 'application/pdf'
    }
  }
}


