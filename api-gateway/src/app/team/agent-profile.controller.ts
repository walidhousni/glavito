/**
 * Agent Profile Controller
 * Handles agent profile-related API endpoints
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { 
  AgentProfileService, 
  CreateAgentProfileRequest, 
  UpdateAgentProfileRequest,
  AgentAvailabilityRequest
} from './agent-profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@glavito/shared-auth';

@ApiTags('agent-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agent-profiles')
export class AgentProfileController {
  constructor(private readonly agentProfileService: AgentProfileService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create agent profile' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Agent profile created successfully',
  })
  async createAgentProfile(
    @Request() req: any,
    @Body() request: CreateAgentProfileRequest
  ) {
    const { tenantId } = req.user;
    return this.agentProfileService.createAgentProfile(tenantId, request);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agent profiles' })
  @ApiQuery({ name: 'availability', required: false, type: String })
  @ApiQuery({ name: 'skills', required: false, type: [String] })
  @ApiQuery({ name: 'languages', required: false, type: [String] })
  @ApiQuery({ name: 'autoAssign', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent profiles retrieved successfully',
  })
  async getAgentProfiles(
    @Request() req: any,
    @Query('availability') availability?: string,
    @Query('skills') skills?: string[],
    @Query('languages') languages?: string[],
    @Query('autoAssign') autoAssign?: boolean
  ) {
    // Admin-only listing
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Only admins can list agent profiles');
    }
    const { tenantId } = req.user;
    const filters = {
      availability,
      skills: Array.isArray(skills) ? skills : skills ? [skills] : undefined,
      languages: Array.isArray(languages) ? languages : languages ? [languages] : undefined,
      autoAssign,
    };
    return this.agentProfileService.getAgentProfiles(tenantId, filters);
  }

  @Get('available')
  @Roles('admin')
  @ApiOperation({ summary: 'Get available agents for assignment' })
  @ApiQuery({ name: 'skills', required: false, type: [String] })
  @ApiQuery({ name: 'languages', required: false, type: [String] })
  @ApiQuery({ name: 'maxLoad', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available agents retrieved successfully',
  })
  async getAvailableAgents(
    @Request() req: any,
    @Query('skills') skills?: string[],
    @Query('languages') languages?: string[],
    @Query('maxLoad') maxLoad?: boolean
  ) {
    const { tenantId } = req.user;
    const filters = {
      skills: Array.isArray(skills) ? skills : skills ? [skills] : undefined,
      languages: Array.isArray(languages) ? languages : languages ? [languages] : undefined,
      maxLoad,
    };
    return this.agentProfileService.getAvailableAgents(tenantId, filters);
  }

  @Get('skills/analytics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get skills analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills analytics retrieved successfully',
  })
  async getSkillsAnalytics(@Request() req: any) {
    const { tenantId } = req.user;
    return this.agentProfileService.getSkillsAnalytics(tenantId);
  }

  @Get(':userId')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get agent profile by user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent profile retrieved successfully',
  })
  async getAgentProfile(
    @Request() req: any,
    @Param('userId') userId: string
  ) {
    const { tenantId, id: currentUserId, role } = req.user;
    if (role !== 'admin' && role !== 'super_admin' && currentUserId !== userId) {
      throw new ForbiddenException('Cannot access another agent profile');
    }
    return this.agentProfileService.getAgentProfile(tenantId, userId);
  }

  @Put(':userId')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Update agent profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent profile updated successfully',
  })
  async updateAgentProfile(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() request: UpdateAgentProfileRequest
  ) {
    const { tenantId, id: currentUserId, role } = req.user;
    if (role !== 'admin' && role !== 'super_admin' && currentUserId !== userId) {
      throw new ForbiddenException('Cannot update another agent profile');
    }
    return this.agentProfileService.updateAgentProfile(tenantId, userId, request);
  }

  @Put(':userId/availability')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Update agent availability' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent availability updated successfully',
  })
  async updateAgentAvailability(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() request: AgentAvailabilityRequest
  ) {
    const { tenantId, id: currentUserId, role } = req.user;
    if (role !== 'admin' && role !== 'super_admin' && currentUserId !== userId) {
      throw new ForbiddenException('Cannot update another agent availability');
    }
    await this.agentProfileService.updateAgentAvailability(tenantId, userId, request);
    return { success: true, message: 'Availability updated successfully' };
  }

  @Get(':userId/performance')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get agent performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent performance metrics retrieved successfully',
  })
  async getAgentPerformanceMetrics(
    @Request() req: any,
    @Param('userId') userId: string
  ) {
    const { tenantId, id: currentUserId, role } = req.user;
    if (role !== 'admin' && role !== 'super_admin' && currentUserId !== userId) {
      throw new ForbiddenException('Cannot access another agent performance');
    }
    return this.agentProfileService.getAgentPerformanceMetrics(tenantId, userId);
  }

  @Get('top/performers')
  @Roles('admin')
  @ApiOperation({ summary: 'Get top-performing agents for the tenant' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getTopAgents(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { tenantId } = req.user
    const l = Math.max(1, Math.min(50, Number(limit || 3)))
    const opts = {
      limit: l,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }
    return this.agentProfileService.getTopAgents(tenantId, opts as any)
  }

  // Agent Goals Endpoints

  @Post(':userId/goals')
  @ApiOperation({ summary: 'Create agent goal' })
  async createGoal(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: {
      type: 'daily' | 'weekly' | 'monthly';
      metric: 'tickets_resolved' | 'response_time' | 'csat_score';
      target: number;
      startDate: string;
      endDate: string;
    }
  ) {
    // Dynamically import to avoid circular dependency
    const { AgentGoalsService } = await import('./agent-goals.service');
    const goalsService = new AgentGoalsService(this.agentProfileService['db']);
    
    return goalsService.createGoal({
      userId,
      type: body.type,
      metric: body.metric,
      target: body.target,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Get(':userId/goals')
  @ApiOperation({ summary: 'Get agent goals' })
  @ApiQuery({ name: 'type', required: false, type: String })
  async getGoals(
    @Request() req: any,
    @Param('userId') userId: string,
    @Query('type') type?: string,
  ) {
    const { AgentGoalsService } = await import('./agent-goals.service');
    const goalsService = new AgentGoalsService(this.agentProfileService['db']);
    return goalsService.getGoals(userId, type);
  }

  @Get(':userId/achievements')
  @ApiOperation({ summary: 'Get agent achievements' })
  async getAchievements(
    @Request() req: any,
    @Param('userId') userId: string,
  ) {
    const { AgentGoalsService } = await import('./agent-goals.service');
    const goalsService = new AgentGoalsService(this.agentProfileService['db']);
    return goalsService.getAchievements(userId);
  }

  @Post(':userId/goals/:goalId/progress')
  @ApiOperation({ summary: 'Update goal progress' })
  async updateGoalProgress(
    @Request() req: any,
    @Param('userId') userId: string,
    @Param('goalId') goalId: string,
    @Body() body: { current: number },
  ) {
    const { AgentGoalsService } = await import('./agent-goals.service');
    const goalsService = new AgentGoalsService(this.agentProfileService['db']);
    return goalsService.updateGoalProgress(goalId, body.current);
  }
}