/**
 * Invitation Management Controller
 * Handles team invitation API endpoints
 */

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InvitationService, type SendInvitationRequest, type BulkInviteRequest, type AcceptInvitationRequest } from './invitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send team invitation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invitation sent successfully',
  })
  async sendInvitation(
    @Request() req: any,
    @Body() request: SendInvitationRequest
  ) {
    const { tenantId, id } = req.user;
    return this.invitationService.sendInvitation(tenantId, id, request);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk team invitations' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk invitations processed',
  })
  async sendBulkInvitations(
    @Request() req: any,
    @Body() request: BulkInviteRequest
  ) {
    const { tenantId, id } = req.user;
    return this.invitationService.sendBulkInvitations(tenantId, request, id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team invitations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitations retrieved successfully',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  async getInvitations(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const { tenantId } = req.user;
    return this.invitationService.getInvitations(tenantId, status);
  }

  @Post(':invitationId/resend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend team invitation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation resent successfully',
  })
  async resendInvitation(
    @Request() req: any,
    @Param('invitationId') invitationId: string
  ) {
    const { tenantId } = req.user;
    return this.invitationService.resendInvitation(tenantId, invitationId);
  }

  @Delete(':invitationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel team invitation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation cancelled successfully',
  })
  async cancelInvitation(
    @Request() req: any,
    @Param('invitationId') invitationId: string
  ) {
    const { tenantId } = req.user;
    await this.invitationService.cancelInvitation(tenantId, invitationId);
    return { success: true, message: 'Invitation cancelled successfully' };
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept team invitation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation accepted successfully',
  })
  async acceptInvitation(@Body() request: AcceptInvitationRequest) {
    return this.invitationService.acceptInvitation(request);
  }

  @Get('validate/:token')
  @ApiOperation({ summary: 'Validate invitation token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation token validation result',
  })
  async validateInvitationToken(@Param('token') token: string) {
    return this.invitationService.getInvitationByToken(token);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invitation statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation statistics retrieved successfully',
  })
  async getInvitationStats(@Request() req: any) {
    const { tenantId } = req.user;
    return this.invitationService.getInvitationStats(tenantId);
  }

  @Post('cleanup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clean up expired invitations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expired invitations cleaned up',
  })
  async cleanupExpiredInvitations() {
    const cleanedCount = await this.invitationService.cleanupExpiredInvitations();
    return {
      success: true,
      message: `Cleaned up ${cleanedCount} expired invitations`
    };
  }
}