import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

@Injectable()
export class FaqService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(tenantId: string, createFaqDto: any) {
    const payload = {
      tenantId,
      title: createFaqDto.title,
      content: createFaqDto.content,
      category: createFaqDto.category || 'General',
      tags: Array.isArray(createFaqDto.tags) ? createFaqDto.tags : [],
      isPublished: !!createFaqDto.isPublished,
    } as const;
    return this.databaseService.faqArticle.create({ data: payload });
  }

  async findAll(tenantId: string) {
    return this.databaseService.faqArticle.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  async findOne(tenantId: string, id: string) {
    return this.databaseService.faqArticle.findFirst({ where: { id, tenantId } });
  }

  async update(tenantId: string, id: string, updateFaqDto: any) {
    const result = await this.databaseService.faqArticle.updateMany({ where: { id, tenantId }, data: updateFaqDto });
    if (!result.count) throw new NotFoundException('FAQ not found');
    return this.databaseService.faqArticle.findFirst({ where: { id, tenantId } });
  }

  async remove(tenantId: string, id: string) {
    const result = await this.databaseService.faqArticle.deleteMany({ where: { id, tenantId } });
    if (!result.count) throw new NotFoundException('FAQ not found');
    return { success: true } as const;
  }
}