import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@glavito/shared-auth';
import { LeadScoringService } from '../services/lead-scoring.service';
import { DatabaseService } from '@glavito/shared-database';

@Controller('crm/lead-scoring')
@UseGuards(JwtAuthGuard)
export class LeadScoringController {
  constructor(
    private readonly leadScoringService: LeadScoringService,
    private readonly db: DatabaseService
  ) {}

  /**
   * Calculate score for a specific lead
   */
  @Post('leads/:leadId/calculate')
  async calculateLeadScore(
    @Param('leadId') leadId: string,
    @Query('modelId') modelId?: string
  ) {
    const result = await this.leadScoringService.calculateLeadScore(leadId, modelId);
    await this.leadScoringService.updateLeadScore(leadId, result, modelId);
    
    return {
      success: true,
      score: result.score,
      breakdown: result.breakdown,
      reasons: result.reason,
      predictedValue: result.predictedValue,
      conversionProbability: result.conversionProbability
    };
  }

  /**
   * Bulk score all leads for tenant
   */
  @Post('bulk-score')
  async bulkScoreLeads(
    @CurrentTenant() tenantId: string,
    @Query('modelId') modelId?: string
  ) {
    const result = await this.leadScoringService.scoreAllLeads(tenantId, modelId);
    
    return {
      success: true,
      ...result
    };
  }

  /**
   * Create a new scoring model
   */
  @Post('models')
  async createScoringModel(
    @CurrentTenant() tenantId: string,
    @Body() data: {
      name: string;
      description?: string;
      industry?: string;
      rules: any[];
      weightConfig?: any;
      thresholds?: any;
      isDefault?: boolean;
    }
  ) {
    const model = await this.db.leadScoringModel.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        industry: data.industry,
        rules: data.rules,
        weightConfig: data.weightConfig || {},
        thresholds: data.thresholds || {},
        isDefault: data.isDefault || false,
        isActive: true
      }
    });

    return model;
  }

  /**
   * Update a scoring model
   */
  @Put('models/:modelId')
  async updateScoringModel(
    @Param('modelId') modelId: string,
    @Body() data: {
      name?: string;
      description?: string;
      industry?: string;
      rules?: any[];
      weightConfig?: any;
      thresholds?: any;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ) {
    const model = await this.db.leadScoringModel.update({
      where: { id: modelId },
      data: {
        name: data.name,
        description: data.description,
        industry: data.industry,
        rules: data.rules as any,
        weightConfig: data.weightConfig as any,
        thresholds: data.thresholds as any,
        isDefault: data.isDefault,
        isActive: data.isActive,
        updatedAt: new Date()
      }
    });

    return model;
  }

  /**
   * Get all scoring models for tenant
   */
  @Get('models')
  async listScoringModels(
    @CurrentTenant() tenantId: string,
    @Query('industry') industry?: string
  ) {
    const where: any = { tenantId };
    if (industry) where.industry = industry;

    const models = await this.db.leadScoringModel.findMany({
      where,
      include: {
        _count: {
          select: { leads: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return models;
  }

  /**
   * Get a specific scoring model
   */
  @Get('models/:modelId')
  async getScoringModel(@Param('modelId') modelId: string) {
    const model = await this.db.leadScoringModel.findUnique({
      where: { id: modelId },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    return model;
  }

  /**
   * Get scoring model analytics
   */
  @Get('models/:modelId/analytics')
  async getModelAnalytics(@Param('modelId') modelId: string) {
    return this.leadScoringService.getModelAnalytics(modelId);
  }

  /**
   * Get lead score history
   */
  @Get('leads/:leadId/history')
  async getLeadScoreHistory(@Param('leadId') leadId: string) {
    const lead = await this.db.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        score: true,
        scoreHistory: true,
        scoreReason: true,
        predictedValue: true,
        conversionProbability: true
      }
    });

    return lead;
  }
}

