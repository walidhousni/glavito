import { Controller, Get, Post, Body, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService } from '../knowledge/knowledge.service';
import type {
  KnowledgeBaseSetupRequest,
  CreateArticleRequest
} from '@glavito/shared-types';

type AuthUser = { tenantId: string; id?: string; userId?: string };

@ApiTags('onboarding/knowledge-base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding/knowledge-base')
export class OnboardingKnowledgeCompatController {
  constructor(private readonly kb: KnowledgeService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Setup knowledge base (compat)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'KB setup initialized' })
  async setup(
    @Request() req: { user: AuthUser },
    @Body() request: KnowledgeBaseSetupRequest
  ) {
    const { tenantId, id, userId: uid } = req.user;
    const userId = id || uid || '';

    let articlesCreated = 0;
    if (request.defaultArticles?.length) {
      for (const article of request.defaultArticles) {
        await this.kb.createArticle(tenantId, userId, article as CreateArticleRequest);
        articlesCreated += 1;
      }
    }

    return {
      success: true,
      articlesCreated,
      categoriesCreated: request.initialCategories || [],
      message: 'Knowledge base initialized'
    };
  }

  @Post('articles')
  @ApiOperation({ summary: 'Create KB article (compat)' })
  async createArticle(
    @Request() req: { user: AuthUser },
    @Body() request: CreateArticleRequest
  ) {
    const { tenantId, id, userId: uid } = req.user;
    const userId = id || uid || '';
    return this.kb.createArticle(tenantId, userId, request);
  }

  @Get('articles')
  @ApiOperation({ summary: 'List KB articles (compat)' })
  async listArticles(@Request() req: { user: AuthUser }) {
    const { tenantId } = req.user;
    const { items, total } = await this.kb.listArticles(tenantId, undefined, 1, 50);
    return { articles: items as any, totalCount: total };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get KB stats (compat)' })
  async stats(@Request() req: { user: AuthUser }) {
    const { tenantId } = req.user;
    return this.kb.analyticsOverview(tenantId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get AI article suggestions (compat)' })
  async suggestions(@Request() req: { user: AuthUser }) {
    const { tenantId } = req.user;
    return this.kb.suggest(tenantId, '').then((s: any) => (s.articles || []).slice(0, 5));
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get KB categories (compat)' })
  async categories(@Request() req: { user: AuthUser }) {
    const { tenantId } = req.user;
    const { items } = await this.kb.listArticles(tenantId, undefined, 1, 500);
    return Array.from(new Set((items as any[]).map(i => i.category))).sort();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get KB tags (compat)' })
  async tags(@Request() req: { user: AuthUser }) {
    const { tenantId } = req.user;
    const { items } = await this.kb.listArticles(tenantId, undefined, 1, 1000);
    const counts = new Map<string, number>();
    (items as any[]).forEach(a => (a.tags || []).forEach((t: string) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 20);
  }
}


