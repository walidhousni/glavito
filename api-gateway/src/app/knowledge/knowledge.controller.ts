import { Controller, Get, Query, Param, UseGuards, Req, Post, Body, Patch, Delete, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@glavito/shared-auth';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search knowledge base and FAQs (tenant-scoped)' })
  @Header('Cache-Control', 'private, max-age=30')
  async search(@Req() req: any, @Query('q') q: string, @Query('limit') limit?: string, @Query('semantic') semantic?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.search(tenantId, q || '', limit ? parseInt(limit, 10) : 10, { semantic: semantic === 'true' });
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Suggest relevant KB/FAQ for given text' })
  @Header('Cache-Control', 'private, max-age=30')
  async suggest(@Req() req: any, @Query('text') text: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.suggest(tenantId, text || '');
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Get KB article by id' })
  async getArticle(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.getArticle(tenantId, id);
  }

  @Get('faqs/:id')
  @ApiOperation({ summary: 'Get FAQ article by id' })
  async getFaq(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.getFaq(tenantId, id);
  }

  @Get('generate/from-ticket/:ticketId')
  @ApiOperation({ summary: 'Generate a draft KB article from a ticket' })
  async generateFromTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.knowledgeService.generateFromTicket(tenantId, userId, ticketId);
  }

  // Authoring APIs
  @Get('articles')
  @ApiOperation({ summary: 'List knowledge articles (admin-authoring)' })
  @Roles('admin')
  async listArticles(@Req() req: any, @Query('q') q?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.listArticles(tenantId, q, page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 20);
  }

  @Post('articles')
  @ApiOperation({ summary: 'Create a knowledge article (admin-authoring)' })
  @Roles('admin')
  async createArticle(@Req() req: any, @Body() body: { title: string; content: string; tags?: string[]; category?: string; publish?: boolean }) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.knowledgeService.createArticle(tenantId, userId, body);
  }

  @Patch('articles/:id')
  @ApiOperation({ summary: 'Update a knowledge article (admin-authoring)' })
  @Roles('admin')
  async updateArticle(@Req() req: any, @Param('id') id: string, @Body() body: { title?: string; content?: string; tags?: string[]; category?: string }) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.knowledgeService.updateArticle(tenantId, userId, id, body);
  }

  @Post('articles/:id/publish')
  @ApiOperation({ summary: 'Publish/unpublish article (admin-authoring)' })
  @Roles('admin')
  async publishArticle(@Req() req: any, @Param('id') id: string, @Body() body: { publish: boolean }) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.publishArticle(tenantId, id, !!body.publish);
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: 'Delete a knowledge article' })
  @Roles('admin')
  async deleteArticle(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.deleteArticle(tenantId, id);
  }

  @Get('articles/:id/related')
  @ApiOperation({ summary: 'Get related articles for an article' })
  @Roles('admin')
  async related(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.relatedArticles(tenantId, id, 5);
  }

  // Knowledge graph APIs
  @Get('entities')
  @ApiOperation({ summary: 'List knowledge entities' })
  @Roles('admin')
  async listEntities(@Req() req: any, @Query('q') q?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.listEntities(tenantId, q);
  }

  @Post('entities')
  @ApiOperation({ summary: 'Upsert a knowledge entity' })
  @Roles('admin')
  async upsertEntity(@Req() req: any, @Body() body: { type: string; name: string; aliases?: string[]; metadata?: Record<string, unknown> }) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.upsertEntity(tenantId, body);
  }

  @Get('relations')
  @ApiOperation({ summary: 'List knowledge relations (optionally for an article)' })
  @Roles('admin')
  async listRelations(@Req() req: any, @Query('articleId') articleId?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.listRelations(tenantId, articleId);
  }

  @Post('relations/article-article')
  @ApiOperation({ summary: 'Link two articles with a relation' })
  @Roles('admin')
  async linkArticles(@Req() req: any, @Body() body: { sourceId: string; targetId: string; relationType: string; weight?: number }) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.linkArticles(tenantId, body.sourceId, body.targetId, body.relationType, body.weight);
  }

  @Post('relations/article-entity')
  @ApiOperation({ summary: 'Link an article to an entity' })
  @Roles('admin')
  async linkArticleEntity(@Req() req: any, @Body() body: { articleId: string; entityId: string; relationType: string; weight?: number }) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.linkArticleEntity(tenantId, body.articleId, body.entityId, body.relationType, body.weight);
  }

  // Versions
  @Get('articles/:id/versions')
  @ApiOperation({ summary: 'List article versions' })
  @Roles('admin')
  async versions(@Param('id') id: string) {
    return this.knowledgeService.listVersions(id);
  }

  // Approvals
  @Get('approvals')
  @ApiOperation({ summary: 'List approval requests' })
  @Roles('admin')
  async approvals(@Req() req: any, @Query('status') status?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.listApprovals(tenantId, status);
  }

  @Post('approvals')
  @ApiOperation({ summary: 'Request approval for an article' })
  @Roles('admin')
  async requestApproval(@Req() req: any, @Body() body: { articleId: string; comments?: string }) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.knowledgeService.requestApproval(tenantId, body.articleId, userId, body.comments);
  }

  @Post('approvals/:id/decide')
  @ApiOperation({ summary: 'Approve or reject an approval request' })
  @Roles('admin')
  async decide(@Req() req: any, @Param('id') id: string, @Body() body: { approve: boolean; comments?: string }) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.knowledgeService.decideApproval(tenantId, id, userId, !!body.approve, body.comments);
  }

  // Usage analytics
  @Get('analytics/overview')
  @ApiOperation({ summary: 'Knowledge analytics overview' })
  @Roles('admin')
  async analyticsOverview(@Req() req: any, @Query('days') days?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.analyticsOverview(tenantId, days ? parseInt(days, 10) : 30);
  }

  // Maintenance
  @Get('maintenance/outdated')
  @ApiOperation({ summary: 'List outdated articles that need review' })
  @Roles('admin')
  async outdated(@Req() req: any, @Query('thresholdDays') thresholdDays?: string, @Query('minHelpfulRate') minHelpfulRate?: string, @Query('minViews') minViews?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.findOutdated(
      tenantId,
      thresholdDays ? parseInt(thresholdDays, 10) : 90,
      minHelpfulRate ? parseFloat(minHelpfulRate) : 0.1,
      minViews ? parseInt(minViews, 10) : 20,
    );
  }

  @Post('maintenance/:id/reviewed')
  @ApiOperation({ summary: 'Mark article as reviewed' })
  @Roles('admin')
  async markReviewed(@Req() req: any, @Param('id') id: string, @Body() body?: { nextReviewAt?: string }) {
    const tenantId = req.user?.tenantId as string;
    return this.knowledgeService.markReviewed(tenantId, id, body?.nextReviewAt ? new Date(body.nextReviewAt) : undefined);
  }
}


