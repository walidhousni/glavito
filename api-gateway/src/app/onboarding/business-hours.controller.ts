/**
 * Business Hours Management Controller
 * Handles business hours configuration and calculations API endpoints
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
  BusinessHoursService,
  CreateBusinessHoursRequest,
  UpdateBusinessHoursRequest,
} from './business-hours.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('business-hours')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business-hours')
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {}

  @Post()
  @ApiOperation({ summary: 'Create business hours configuration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Business hours configuration created successfully',
  })
  async createBusinessHours(
    @Request() req: any,
    @Body() request: CreateBusinessHoursRequest
  ) {
    const { tenantId, userId } = req.user;
    return this.businessHoursService.createBusinessHours(tenantId, request, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get business hours configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business hours configuration retrieved successfully',
  })
  async getBusinessHours(@Request() req: any) {
    const { tenantId } = req.user;
    const businessHours = await this.businessHoursService.getBusinessHours(tenantId);
    return businessHours || { message: 'No business hours configuration found' };
  }

  @Put()
  @ApiOperation({ summary: 'Update business hours configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business hours configuration updated successfully',
  })
  async updateBusinessHours(
    @Request() req: any,
    @Body() request: UpdateBusinessHoursRequest
  ) {
    const { tenantId, userId } = req.user;
    return this.businessHoursService.updateBusinessHours(tenantId, request, userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete business hours configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business hours configuration deleted successfully',
  })
  async deleteBusinessHours(@Request() req: any) {
    const { tenantId, userId } = req.user;
    await this.businessHoursService.deleteBusinessHours(tenantId, userId);
    return { success: true, message: 'Business hours configuration deleted successfully' };
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if current time is within business hours' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business hours check completed successfully',
  })
  @ApiQuery({ name: 'timestamp', required: false, description: 'Timestamp to check (ISO string)' })
  async checkBusinessHours(
    @Request() req: any,
    @Query('timestamp') timestamp?: string
  ) {
    const { tenantId } = req.user;
    const checkTime = timestamp ? new Date(timestamp) : undefined;
    return this.businessHoursService.isBusinessHours(tenantId, checkTime);
  }

  @Post('calculate-working-time')
  @ApiOperation({ summary: 'Calculate working time between two dates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Working time calculated successfully',
  })
  async calculateWorkingTime(
    @Request() req: any,
    @Body() body: { startDate: string; endDate: string }
  ) {
    const { tenantId } = req.user;
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    return this.businessHoursService.calculateWorkingTime(tenantId, startDate, endDate);
  }

  @Post('add-business-time')
  @ApiOperation({ summary: 'Add business time to a date' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business time added successfully',
  })
  async addBusinessTime(
    @Request() req: any,
    @Body() body: { startDate: string; minutes: number }
  ) {
    const { tenantId } = req.user;
    const startDate = new Date(body.startDate);
    const result = await this.businessHoursService.addBusinessTime(tenantId, startDate, body.minutes);
    return { resultDate: result };
  }

  @Get('next-business-day')
  @ApiOperation({ summary: 'Get next business day' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Next business day retrieved successfully',
  })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Date to calculate from (ISO string)' })
  async getNextBusinessDay(
    @Request() req: any,
    @Query('fromDate') fromDate?: string
  ) {
    const { tenantId } = req.user;
    const checkDate = fromDate ? new Date(fromDate) : undefined;
    const result = await this.businessHoursService.getNextBusinessDay(tenantId, checkDate);
    return { nextBusinessDay: result };
  }

  @Post('holidays')
  @ApiOperation({ summary: 'Add holiday to business hours' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Holiday added successfully',
  })
  async addHoliday(
    @Request() req: any,
    @Body() body: { date: string }
  ) {
    const { tenantId, userId } = req.user;
    await this.businessHoursService.addHoliday(tenantId, body.date, userId);
    return { success: true, message: 'Holiday added successfully' };
  }

  @Delete('holidays/:date')
  @ApiOperation({ summary: 'Remove holiday from business hours' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Holiday removed successfully',
  })
  async removeHoliday(
    @Request() req: any,
    @Param('date') date: string
  ) {
    const { tenantId, userId } = req.user;
    await this.businessHoursService.removeHoliday(tenantId, date, userId);
    return { success: true, message: 'Holiday removed successfully' };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get business hours templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business hours templates retrieved successfully',
  })
  async getBusinessHoursTemplates() {
    // Return common business hours templates
    return {
      templates: [
        {
          name: 'Standard Business Hours',
          description: '9 AM to 5 PM, Monday to Friday',
          timezone: 'UTC',
          schedule: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: false, start: '09:00', end: '17:00' },
            sunday: { enabled: false, start: '09:00', end: '17:00' },
          },
        },
        {
          name: 'Extended Business Hours',
          description: '8 AM to 6 PM, Monday to Friday',
          timezone: 'UTC',
          schedule: {
            monday: { enabled: true, start: '08:00', end: '18:00' },
            tuesday: { enabled: true, start: '08:00', end: '18:00' },
            wednesday: { enabled: true, start: '08:00', end: '18:00' },
            thursday: { enabled: true, start: '08:00', end: '18:00' },
            friday: { enabled: true, start: '08:00', end: '18:00' },
            saturday: { enabled: false, start: '08:00', end: '18:00' },
            sunday: { enabled: false, start: '08:00', end: '18:00' },
          },
        },
        {
          name: '24/7 Support',
          description: 'Round-the-clock support, all days',
          timezone: 'UTC',
          schedule: {
            monday: { enabled: true, start: '00:00', end: '23:59' },
            tuesday: { enabled: true, start: '00:00', end: '23:59' },
            wednesday: { enabled: true, start: '00:00', end: '23:59' },
            thursday: { enabled: true, start: '00:00', end: '23:59' },
            friday: { enabled: true, start: '00:00', end: '23:59' },
            saturday: { enabled: true, start: '00:00', end: '23:59' },
            sunday: { enabled: true, start: '00:00', end: '23:59' },
          },
        },
        {
          name: 'Weekend Support',
          description: '9 AM to 5 PM, including weekends',
          timezone: 'UTC',
          schedule: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: true, start: '09:00', end: '17:00' },
            sunday: { enabled: true, start: '09:00', end: '17:00' },
          },
        },
      ],
    };
  }

  @Get('timezones')
  @ApiOperation({ summary: 'Get available timezones' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available timezones retrieved successfully',
  })
  async getTimezones() {
    // Return common timezones
    return {
      timezones: [
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
        { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
        { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
        { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
        { value: 'Europe/London', label: 'London (GMT/BST)' },
        { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
        { value: 'Asia/Kolkata', label: 'India (IST)' },
        { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
        { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
      ],
    };
  }
}