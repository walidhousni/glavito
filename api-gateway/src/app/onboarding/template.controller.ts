/**
 * Template Controller
 * Handles template management API endpoints
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  TemplateService,
  OnboardingTemplate,
  TemplateFilter,
  SmartRecommendation,
} from './template.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get onboarding templates' })
  @ApiQuery({ name: 'industry', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'companySize', required: false })
  @ApiQuery({ name: 'complexity', required: false })
  @ApiQuery({ name: 'rating', required: false, type: 'number' })
  @ApiQuery({ name: 'isOfficial', required: false, type: 'boolean' })
  @ApiQuery({ name: 'isPublic', required: false, type: 'boolean' })
  @ApiQuery({ name: 'tags', required: false, type: 'string', isArray: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
  })
  async getTemplates(
    @Query('industry') industry?: string,
    @Query('category') category?: string,
    @Query('companySize') companySize?: string,
    @Query('complexity') complexity?: string,
    @Query('rating') rating?: number,
    @Query('isOfficial') isOfficial?: boolean,
    @Query('isPublic') isPublic?: boolean,
    @Query('tags') tags?: string[]
  ) {
    const filter: TemplateFilter = {
      industry,
      category,
      companySize,
      complexity,
      rating,
      isOfficial,
      isPublic,
      tags,
    };

    // Remove undefined values
    Object.keys(filter).forEach(key => {
      if ((filter as any)[key] === undefined) {
        delete (filter as any)[key];
      }
    });

    return this.templateService.getTemplates(Object.keys(filter).length > 0 ? filter : undefined);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get template categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template categories retrieved successfully',
  })
  async getTemplateCategories() {
    return this.templateService.getTemplateCategories();
  }

  @Get('industries')
  @ApiOperation({ summary: 'Get template industries' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template industries retrieved successfully',
  })
  async getTemplateIndustries() {
    return this.templateService.getTemplateIndustries();
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get smart template recommendations' })
  @ApiQuery({ name: 'industry', required: false })
  @ApiQuery({ name: 'companySize', required: false })
  @ApiQuery({ name: 'useCase', required: false })
  @ApiQuery({ name: 'existingTools', required: false, type: 'string', isArray: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Smart recommendations retrieved successfully',
  })
  async getSmartRecommendations(
    @Request() req: any,
    @Query('industry') industry?: string,
    @Query('companySize') companySize?: string,
    @Query('useCase') useCase?: string,
    @Query('existingTools') existingTools?: string[]
  ): Promise<SmartRecommendation[]> {
    const { tenantId } = req.user;
    
    const context = {
      industry,
      companySize,
      useCase,
      existingTools,
    };

    return this.templateService.getSmartRecommendations(tenantId, context);
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
  })
  async getTemplate(@Param('templateId') templateId: string) {
    return this.templateService.getTemplate(templateId);
  }

  @Post()
  @ApiOperation({ summary: 'Create custom template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
  })
  async createTemplate(
    @Request() req: any,
    @Body() templateData: Partial<OnboardingTemplate>
  ) {
    const { tenantId, userId } = req.user;
    return this.templateService.createTemplate(tenantId, userId, templateData);
  }

  @Put(':templateId')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
  })
  async updateTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() updates: Partial<OnboardingTemplate>
  ) {
    const { userId } = req.user;
    return this.templateService.updateTemplate(templateId, userId, updates);
  }

  @Delete(':templateId')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Template deleted successfully',
  })
  async deleteTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string
  ) {
    const { userId } = req.user;
    await this.templateService.deleteTemplate(templateId, userId);
  }

  @Post(':templateId/apply')
  @ApiOperation({ summary: 'Apply template to tenant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template applied successfully',
  })
  async applyTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() customizations?: Record<string, any>
  ) {
    const { tenantId } = req.user;
    await this.templateService.applyTemplate(tenantId, templateId, customizations);
    return { message: 'Template applied successfully' };
  }

  @Post(':templateId/reviews')
  @ApiOperation({ summary: 'Add template review' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review added successfully',
  })
  async addTemplateReview(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() review: {
      rating: number;
      comment: string;
      pros: string[];
      cons: string[];
    }
  ) {
    const { userId, userName } = req.user;
    await this.templateService.addTemplateReview(templateId, userId, userName, review);
    return { message: 'Review added successfully' };
  }

  @Get('featured/popular')
  @ApiOperation({ summary: 'Get popular templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular templates retrieved successfully',
  })
  async getPopularTemplates() {
    const templates = await this.templateService.getTemplates({ isPublic: true });
    
    // Sort by usage count and rating
    return templates
      .sort((a, b) => {
        const scoreA = a.usageCount * 0.7 + a.rating * 0.3;
        const scoreB = b.usageCount * 0.7 + b.rating * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 10);
  }

  @Get('featured/recent')
  @ApiOperation({ summary: 'Get recently updated templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent templates retrieved successfully',
  })
  async getRecentTemplates() {
    const templates = await this.templateService.getTemplates({ isPublic: true });
    
    // Sort by update date
    return templates
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);
  }

  @Get('featured/official')
  @ApiOperation({ summary: 'Get official templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Official templates retrieved successfully',
  })
  async getOfficialTemplates() {
    return this.templateService.getTemplates({ isOfficial: true, isPublic: true });
  }

  @Get('search/suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'query', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search suggestions retrieved successfully',
  })
  async getSearchSuggestions(@Query('query') query: string) {
    const templates = await this.templateService.getTemplates({ isPublic: true });
    
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    templates.forEach(template => {
      // Add matching template names
      if (template.name.toLowerCase().includes(queryLower)) {
        suggestions.add(template.name);
      }

      // Add matching tags
      template.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          suggestions.add(tag);
        }
      });

      // Add matching industry
      if (template.industry.toLowerCase().includes(queryLower)) {
        suggestions.add(template.industry);
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }

  @Post('bulk/apply')
  @ApiOperation({ summary: 'Apply multiple templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates applied successfully',
  })
  async applyMultipleTemplates(
    @Request() req: any,
    @Body() request: {
      templateIds: string[];
      customizations?: Record<string, Record<string, any>>;
    }
  ) {
    const { tenantId } = req.user;
    const { templateIds, customizations } = request;

    const results = [];

    for (const templateId of templateIds) {
      try {
        await this.templateService.applyTemplate(
          tenantId,
          templateId,
          customizations?.[templateId]
        );
        results.push({ templateId, status: 'success' });
      } catch (error) {
        results.push({ templateId, status: 'error', message: (error as Error).message });
      }
    }

    return { results };
  }

  @Get('analytics/usage')
  @ApiOperation({ summary: 'Get template usage analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template usage analytics retrieved successfully',
  })
  async getTemplateUsageAnalytics() {
    const templates = await this.templateService.getTemplates({ isPublic: true });
    
    const analytics = {
      totalTemplates: templates.length,
      totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
      averageRating: templates.reduce((sum, t) => sum + t.rating, 0) / templates.length,
      byIndustry: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      topTemplates: templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          name: t.name,
          usageCount: t.usageCount,
          rating: t.rating,
        })),
    };

    // Calculate by industry
    templates.forEach(template => {
      analytics.byIndustry[template.industry] = 
        (analytics.byIndustry[template.industry] || 0) + template.usageCount;
    });

    // Calculate by category
    templates.forEach(template => {
      analytics.byCategory[template.category] = 
        (analytics.byCategory[template.category] || 0) + template.usageCount;
    });

    return analytics;
  }
}