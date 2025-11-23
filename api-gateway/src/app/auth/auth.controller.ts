import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, Param, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '@glavito/shared-auth';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  CreateInvitationRequest,
  AcceptInvitationRequest,
  User
} from '@glavito/shared-types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterRequest): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: { token?: string }, @Query('token') token?: string) {
    const t = body?.token || token || '';
    return this.authService.verifyEmail(t);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent if user exists' })
  async sendPasswordReset(@Body() body: { email: string }) {
    return this.authService.sendPasswordReset(body.email);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm password reset' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() body: { token?: string; password: string },
    @Query('token') token?: string,
  ) {
    const t = body?.token || token || '';
    return this.authService.resetPassword(t, body.password);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email resent if user exists' })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Post('sso/initiate/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate SSO login' })
  @ApiResponse({ status: 200, description: 'SSO URL generated' })
  async initiateSSO(
    @Param('provider') provider: 'google' | 'microsoft' | 'github',
    @Query('mode') mode?: 'mobile' | 'web',
    @Query('redirect') redirect?: string,
  ) {
    return this.authService.initiateSSO(provider, mode, redirect);
  }

  @Get('sso/callback/:provider')
  @ApiOperation({ summary: 'Handle SSO callback' })
  @ApiResponse({ status: 200, description: 'SSO login successful' })
  async handleSSOCallback(
    @Param('provider') provider: 'google' | 'microsoft' | 'github',
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('tenantId') tenantId?: string,
    @Query('redirect') redirect?: string,
    @Res({ passthrough: true }) res?: import('express').Response,
  ) {
    const result: any = await this.authService.handleSSOCallback(provider, code, state, tenantId, redirect);
    if (result && result.redirectUrl && res) {
      res.redirect(result.redirectUrl);
      return;
    }
    return result;
  }

  @Post('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create invitation' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createInvitation(
    @Body() invitationDto: CreateInvitationRequest,
    @Req() req: { user: { id: string; tenantId: string } },
  ) {
    const user = req.user;
    return this.authService.createInvitation({
      ...invitationDto,
      tenantId: user.tenantId,
      inviterUserId: user.id,
    });
  }

  @Get('invitations/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invitation details' })
  @ApiResponse({ status: 200, description: 'Invitation details retrieved' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired' })
  async getInvitation(@Param('token') token: string) {
    return this.authService.getInvitation(token);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiResponse({ status: 201, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired' })
  async acceptInvitation(
    @Param('token') token: string,
    @Body() acceptData: AcceptInvitationRequest,
  ) {
    return this.authService.acceptInvitation(token, acceptData);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserProfile(@Req() req: { user: { id: string } }): Promise<User> {
    const user = req.user;
    return this.authService.getUserProfile(user.id);
  }

  @Get('debug/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Debug: Get current user info including tenantId' })
  @ApiResponse({ status: 200, description: 'User debug info retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDebugMe(@CurrentUser() user: any) {
    return { 
      user, 
      tenantId: user?.tenantId,
      userId: user?.id,
      role: user?.role,
      email: user?.email,
      permissions: user?.permissions,
    };
  }
}