/**
 * Team Management Controller
 * Handles team-related API endpoints
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
  TeamService, 
  CreateTeamRequest, 
  UpdateTeamRequest, 
  AddTeamMemberRequest, 
  UpdateTeamMemberRequest 
} from './team.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Team created successfully',
  })
  async createTeam(
    @Request() req: any,
    @Body() request: CreateTeamRequest
  ) {
    const { tenantId } = req.user;
    return this.teamService.createTeam(tenantId, request);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all teams' })
  @ApiQuery({ name: 'includeMembers', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teams retrieved successfully',
  })
  async getTeams(
    @Request() req: any,
    @Query('includeMembers') includeMembers?: boolean
  ) {
    const { tenantId } = req.user;
    return this.teamService.getTeams(tenantId, includeMembers);
  }

  @Get('stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get team statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team statistics retrieved successfully',
  })
  async getTeamStats(@Request() req: any) {
    const { tenantId } = req.user;
    return this.teamService.getTeamStats(tenantId);
  }

  @Get('available-users')
  @Roles('admin')
  @ApiOperation({ summary: 'Get available users for team assignment' })
  @ApiQuery({ name: 'teamId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available users retrieved successfully',
  })
  async getAvailableUsers(
    @Request() req: any,
    @Query('teamId') teamId?: string
  ) {
    const { tenantId } = req.user;
    return this.teamService.getAvailableUsers(tenantId, teamId);
  }

  @Get(':teamId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team retrieved successfully',
  })
  async getTeam(
    @Request() req: any,
    @Param('teamId') teamId: string
  ) {
    const { tenantId } = req.user;
    return this.teamService.getTeam(tenantId, teamId);
  }

  @Get(':teamId/members')
  @Roles('admin')
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team members retrieved successfully',
  })
  async getTeamMembers(
    @Request() req: any,
    @Param('teamId') teamId: string
  ) {
    const { tenantId } = req.user;
    return this.teamService.getTeamMembers(tenantId, teamId);
  }

  @Put(':teamId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team updated successfully',
  })
  async updateTeam(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() request: UpdateTeamRequest
  ) {
    const { tenantId } = req.user;
    return this.teamService.updateTeam(tenantId, teamId, request);
  }

  @Delete(':teamId')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team deleted successfully',
  })
  async deleteTeam(
    @Request() req: any,
    @Param('teamId') teamId: string
  ) {
    const { tenantId } = req.user;
    await this.teamService.deleteTeam(tenantId, teamId);
    return { success: true, message: 'Team deleted successfully' };
  }

  @Post(':teamId/members')
  @Roles('admin')
  @ApiOperation({ summary: 'Add member to team' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Team member added successfully',
  })
  async addTeamMember(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() request: AddTeamMemberRequest
  ) {
    const { tenantId } = req.user;
    return this.teamService.addTeamMember(tenantId, teamId, request);
  }

  @Put(':teamId/members/:memberId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update team member' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team member updated successfully',
  })
  async updateTeamMember(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() request: UpdateTeamMemberRequest
  ) {
    const { tenantId } = req.user;
    return this.teamService.updateTeamMember(tenantId, teamId, memberId, request);
  }

  @Delete(':teamId/members/:memberId')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove team member' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team member removed successfully',
  })
  async removeTeamMember(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string
  ) {
    const { tenantId } = req.user;
    await this.teamService.removeTeamMember(tenantId, teamId, memberId);
    return { success: true, message: 'Team member removed successfully' };
  }
}