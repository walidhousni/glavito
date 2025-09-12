/**
 * Business Hours Management Service
 * Handles business hours configuration and calculations
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface BusinessHours {
  id: string;
  tenantId: string;
  timezone: string;
  schedule: WeeklySchedule;
  holidays: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
  breaks?: BreakPeriod[];
}

export interface BreakPeriod {
  start: string; // HH:mm format
  end: string; // HH:mm format
  name?: string;
}

export interface CreateBusinessHoursRequest {
  timezone: string;
  schedule: WeeklySchedule;
  holidays?: string[];
}

export interface UpdateBusinessHoursRequest {
  timezone?: string;
  schedule?: WeeklySchedule;
  holidays?: string[];
  isActive?: boolean;
}

export interface BusinessHoursCalculation {
  isBusinessHours: boolean;
  nextBusinessHour?: Date;
  previousBusinessHour?: Date;
  businessMinutesUntil?: number;
  businessMinutesSince?: number;
}

export interface WorkingTimeCalculation {
  totalMinutes: number;
  businessDays: number;
  excludedHolidays: string[];
  breakdown: {
    date: string;
    minutes: number;
    isHoliday: boolean;
    isWeekend: boolean;
  }[];
}

@Injectable()
export class BusinessHoursService {
  private readonly logger = new Logger(BusinessHoursService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create business hours configuration
   */
  async createBusinessHours(
    tenantId: string,
    request: CreateBusinessHoursRequest,
    userId: string
  ): Promise<BusinessHours> {
    try {
      this.logger.log(`Creating business hours for tenant: ${tenantId}`);

      // Validate schedule
      this.validateSchedule(request.schedule);
      this.validateTimezone(request.timezone);

      // Check if business hours already exist
      const existing = await this.databaseService.businessHours.findUnique({
        where: { tenantId },
      });

      if (existing) {
        throw new BadRequestException('Business hours already configured for this tenant');
      }

      const businessHours = await this.databaseService.businessHours.create({
        data: {
          tenantId,
          timezone: request.timezone,
          schedule: request.schedule,
          holidays: request.holidays || [],
        },
      });

      // Emit business hours created event
      this.eventEmitter.emit('business.hours.created', {
        tenantId,
        businessHoursId: businessHours.id,
        userId,
        timezone: request.timezone,
      });

      return this.mapToBusinessHours(businessHours);
    } catch (error) {
      this.logger.error(`Failed to create business hours: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create business hours');
    }
  }

  /**
   * Get business hours configuration
   */
  async getBusinessHours(tenantId: string): Promise<BusinessHours | null> {
    try {
      const businessHours = await this.databaseService.businessHours.findUnique({
        where: { tenantId },
      });

      return businessHours ? this.mapToBusinessHours(businessHours) : null;
    } catch (error) {
      this.logger.error(`Failed to get business hours: ${error.message}`);
      throw new BadRequestException('Failed to get business hours');
    }
  }

  /**
   * Update business hours configuration
   */
  async updateBusinessHours(
    tenantId: string,
    request: UpdateBusinessHoursRequest,
    userId: string
  ): Promise<BusinessHours> {
    try {
      const existing = await this.databaseService.businessHours.findUnique({
        where: { tenantId },
      });

      if (!existing) {
        throw new NotFoundException('Business hours configuration not found');
      }

      // Validate updates
      if (request.schedule) {
        this.validateSchedule(request.schedule);
      }
      if (request.timezone) {
        this.validateTimezone(request.timezone);
      }

      const updatedBusinessHours = await this.databaseService.businessHours.update({
        where: { tenantId },
        data: {
          timezone: request.timezone,
          schedule: request.schedule,
          holidays: request.holidays,
          isActive: request.isActive,
        },
      });

      // Emit business hours updated event
      this.eventEmitter.emit('business.hours.updated', {
        tenantId,
        businessHoursId: updatedBusinessHours.id,
        userId,
        changes: request,
      });

      return this.mapToBusinessHours(updatedBusinessHours);
    } catch (error) {
      this.logger.error(`Failed to update business hours: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update business hours');
    }
  }

  /**
   * Delete business hours configuration
   */
  async deleteBusinessHours(tenantId: string, userId: string): Promise<void> {
    try {
      const existing = await this.databaseService.businessHours.findUnique({
        where: { tenantId },
      });

      if (!existing) {
        throw new NotFoundException('Business hours configuration not found');
      }

      await this.databaseService.businessHours.delete({
        where: { tenantId },
      });

      // Emit business hours deleted event
      this.eventEmitter.emit('business.hours.deleted', {
        tenantId,
        businessHoursId: existing.id,
        userId,
      });

      this.logger.log(`Business hours deleted for tenant: ${tenantId} by ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete business hours: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete business hours');
    }
  }

  /**
   * Check if current time is within business hours
   */
  async isBusinessHours(tenantId: string, timestamp?: Date): Promise<BusinessHoursCalculation> {
    try {
      const businessHours = await this.getBusinessHours(tenantId);
      if (!businessHours || !businessHours.isActive) {
        return {
          isBusinessHours: true, // Default to always business hours if not configured
        };
      }

      const checkTime = timestamp || new Date();
      return this.calculateBusinessHours(businessHours, checkTime);
    } catch (error) {
      this.logger.error(`Failed to check business hours: ${error.message}`);
      throw new BadRequestException('Failed to check business hours');
    }
  }

  /**
   * Calculate working time between two dates
   */
  async calculateWorkingTime(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkingTimeCalculation> {
    try {
      const businessHours = await this.getBusinessHours(tenantId);
      if (!businessHours || !businessHours.isActive) {
        // If no business hours configured, return total time
        const totalMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
        return {
          totalMinutes,
          businessDays: 0,
          excludedHolidays: [],
          breakdown: [],
        };
      }

      return this.calculateWorkingTimeBetweenDates(businessHours, startDate, endDate);
    } catch (error) {
      this.logger.error(`Failed to calculate working time: ${error.message}`);
      throw new BadRequestException('Failed to calculate working time');
    }
  }

  /**
   * Add business time to a date
   */
  async addBusinessTime(
    tenantId: string,
    startDate: Date,
    minutes: number
  ): Promise<Date> {
    try {
      const businessHours = await this.getBusinessHours(tenantId);
      if (!businessHours || !businessHours.isActive) {
        // If no business hours configured, add time directly
        return new Date(startDate.getTime() + minutes * 60 * 1000);
      }

      return this.addBusinessMinutes(businessHours, startDate, minutes);
    } catch (error) {
      this.logger.error(`Failed to add business time: ${error.message}`);
      throw new BadRequestException('Failed to add business time');
    }
  }

  /**
   * Get next business day
   */
  async getNextBusinessDay(tenantId: string, fromDate?: Date): Promise<Date> {
    try {
      const businessHours = await this.getBusinessHours(tenantId);
      const checkDate = fromDate || new Date();

      if (!businessHours || !businessHours.isActive) {
        // If no business hours configured, return next day
        const nextDay = new Date(checkDate);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(9, 0, 0, 0); // Default to 9 AM
        return nextDay;
      }

      return this.findNextBusinessDay(businessHours, checkDate);
    } catch (error) {
      this.logger.error(`Failed to get next business day: ${error.message}`);
      throw new BadRequestException('Failed to get next business day');
    }
  }

  /**
   * Add holiday to business hours
   */
  async addHoliday(tenantId: string, date: string, userId: string): Promise<void> {
    try {
      const businessHours = await this.databaseService.businessHours.findUnique({
        where: { tenantId },
      });

      if (!businessHours) {
        throw new NotFoundException('Business hours configuration not found');
      }

      // Validate date format
      if (!this.isValidDateString(date)) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }

      const holidays = businessHours.holidays as string[];
      if (!holidays.includes(date)) {
        await this.databaseService.businessHours.update({
          where: { tenantId },
          data: {
            holidays: [...holidays, date],
          },
        });

        // Emit holiday added event
        this.eventEmitter.emit('business.hours.holiday.added', {
          tenantId,
          date,
          userId,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to add holiday: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to add holiday');
    }
  }

  /**
   * Remove holiday from business hours
   */
  async removeHoliday(tenantId: string, date: string, userId: string): Promise<void> {
    try {
      const businessHours = await this.databaseService.businessHours.findUnique({
        where: { tenantId },
      });

      if (!businessHours) {
        throw new NotFoundException('Business hours configuration not found');
      }

      const holidays = businessHours.holidays as string[];
      const updatedHolidays = holidays.filter(holiday => holiday !== date);

      if (updatedHolidays.length !== holidays.length) {
        await this.databaseService.businessHours.update({
          where: { tenantId },
          data: {
            holidays: updatedHolidays,
          },
        });

        // Emit holiday removed event
        this.eventEmitter.emit('business.hours.holiday.removed', {
          tenantId,
          date,
          userId,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to remove holiday: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to remove holiday');
    }
  }

  // Private helper methods

  private validateSchedule(schedule: WeeklySchedule): void {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      const daySchedule = schedule[day as keyof WeeklySchedule];
      if (!daySchedule) {
        throw new BadRequestException(`Missing schedule for ${day}`);
      }

      if (daySchedule.enabled) {
        if (!this.isValidTimeFormat(daySchedule.start)) {
          throw new BadRequestException(`Invalid start time format for ${day}. Use HH:mm`);
        }
        if (!this.isValidTimeFormat(daySchedule.end)) {
          throw new BadRequestException(`Invalid end time format for ${day}. Use HH:mm`);
        }
        if (daySchedule.start >= daySchedule.end) {
          throw new BadRequestException(`Start time must be before end time for ${day}`);
        }

        // Validate breaks if present
        if (daySchedule.breaks) {
          for (const breakPeriod of daySchedule.breaks) {
            if (!this.isValidTimeFormat(breakPeriod.start) || !this.isValidTimeFormat(breakPeriod.end)) {
              throw new BadRequestException(`Invalid break time format for ${day}`);
            }
            if (breakPeriod.start >= breakPeriod.end) {
              throw new BadRequestException(`Break start time must be before end time for ${day}`);
            }
          }
        }
      }
    }
  }

  private validateTimezone(timezone: string): void {
    try {
      // Test if timezone is valid by creating a date with it
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch (error) {
      throw new BadRequestException(`Invalid timezone: ${timezone}`);
    }
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private isValidDateString(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
  }

  private calculateBusinessHours(
    businessHours: BusinessHours,
    timestamp: Date
  ): BusinessHoursCalculation {
    // Convert timestamp to business hours timezone
    const localTime = new Date(timestamp.toLocaleString('en-US', { timeZone: businessHours.timezone }));
    const dayOfWeek = this.getDayOfWeek(localTime);
    const timeString = this.formatTime(localTime);
    const dateString = this.formatDate(localTime);

    // Check if it's a holiday
    if (businessHours.holidays.includes(dateString)) {
      return {
        isBusinessHours: false,
        nextBusinessHour: this.findNextBusinessHour(businessHours, timestamp),
      };
    }

    // Get day schedule
    const daySchedule = businessHours.schedule[dayOfWeek];
    if (!daySchedule || !daySchedule.enabled) {
      return {
        isBusinessHours: false,
        nextBusinessHour: this.findNextBusinessHour(businessHours, timestamp),
      };
    }

    // Check if current time is within business hours
    const isWithinHours = timeString >= daySchedule.start && timeString <= daySchedule.end;
    
    // Check if it's during a break
    let isDuringBreak = false;
    if (daySchedule.breaks) {
      for (const breakPeriod of daySchedule.breaks) {
        if (timeString >= breakPeriod.start && timeString <= breakPeriod.end) {
          isDuringBreak = true;
          break;
        }
      }
    }

    const isBusinessHours = isWithinHours && !isDuringBreak;

    return {
      isBusinessHours,
      nextBusinessHour: isBusinessHours ? undefined : this.findNextBusinessHour(businessHours, timestamp),
      previousBusinessHour: isBusinessHours ? undefined : this.findPreviousBusinessHour(businessHours, timestamp),
    };
  }

  private calculateWorkingTimeBetweenDates(
    businessHours: BusinessHours,
    startDate: Date,
    endDate: Date
  ): WorkingTimeCalculation {
    let totalMinutes = 0;
    let businessDays = 0;
    const excludedHolidays: string[] = [];
    const breakdown: WorkingTimeCalculation['breakdown'] = [];

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateString = this.formatDate(currentDate);
      const dayOfWeek = this.getDayOfWeek(currentDate);
      const daySchedule = businessHours.schedule[dayOfWeek];

      let dayMinutes = 0;
      let isHoliday = false;
      let isWeekend = false;

      if (businessHours.holidays.includes(dateString)) {
        isHoliday = true;
        excludedHolidays.push(dateString);
      } else if (daySchedule && daySchedule.enabled) {
        businessDays++;
        
        // Calculate working minutes for this day
        const dayStart = new Date(currentDate);
        const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
        dayStart.setHours(startHour, startMinute, 0, 0);

        const dayEnd = new Date(currentDate);
        const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
        dayEnd.setHours(endHour, endMinute, 0, 0);

        // Adjust for actual start and end times
        const effectiveStart = currentDate.toDateString() === startDate.toDateString() 
          ? new Date(Math.max(startDate.getTime(), dayStart.getTime()))
          : dayStart;

        const effectiveEnd = currentDate.toDateString() === endDate.toDateString()
          ? new Date(Math.min(endDate.getTime(), dayEnd.getTime()))
          : dayEnd;

        if (effectiveStart < effectiveEnd) {
          dayMinutes = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60));
          
          // Subtract break time
          if (daySchedule.breaks) {
            for (const breakPeriod of daySchedule.breaks) {
              const breakStart = new Date(currentDate);
              const [breakStartHour, breakStartMinute] = breakPeriod.start.split(':').map(Number);
              breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

              const breakEnd = new Date(currentDate);
              const [breakEndHour, breakEndMinute] = breakPeriod.end.split(':').map(Number);
              breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

              // Check if break overlaps with working time
              const breakOverlapStart = new Date(Math.max(effectiveStart.getTime(), breakStart.getTime()));
              const breakOverlapEnd = new Date(Math.min(effectiveEnd.getTime(), breakEnd.getTime()));

              if (breakOverlapStart < breakOverlapEnd) {
                const breakMinutes = Math.floor((breakOverlapEnd.getTime() - breakOverlapStart.getTime()) / (1000 * 60));
                dayMinutes -= breakMinutes;
              }
            }
          }
        }
      } else {
        isWeekend = !daySchedule || !daySchedule.enabled;
      }

      totalMinutes += dayMinutes;
      breakdown.push({
        date: dateString,
        minutes: dayMinutes,
        isHoliday,
        isWeekend,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalMinutes,
      businessDays,
      excludedHolidays,
      breakdown,
    };
  }

  private addBusinessMinutes(
    businessHours: BusinessHours,
    startDate: Date,
    minutes: number
  ): Date {
    let remainingMinutes = minutes;
    let currentDate = new Date(startDate);

    while (remainingMinutes > 0) {
      const calculation = this.calculateBusinessHours(businessHours, currentDate);
      
      if (calculation.isBusinessHours) {
        // We're in business hours, add time until end of business day or remaining minutes
        const dayOfWeek = this.getDayOfWeek(currentDate);
        const daySchedule = businessHours.schedule[dayOfWeek];
        
        if (daySchedule && daySchedule.enabled) {
          const endOfDay = new Date(currentDate);
          const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
          endOfDay.setHours(endHour, endMinute, 0, 0);

          const minutesUntilEndOfDay = Math.floor((endOfDay.getTime() - currentDate.getTime()) / (1000 * 60));
          const minutesToAdd = Math.min(remainingMinutes, minutesUntilEndOfDay);

          currentDate = new Date(currentDate.getTime() + minutesToAdd * 60 * 1000);
          remainingMinutes -= minutesToAdd;
        }
      } else {
        // We're not in business hours, jump to next business hour
        if (calculation.nextBusinessHour) {
          currentDate = calculation.nextBusinessHour;
        } else {
          // Fallback: add a day and try again
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(9, 0, 0, 0); // Default to 9 AM
        }
      }
    }

    return currentDate;
  }

  private findNextBusinessHour(businessHours: BusinessHours, fromDate: Date): Date {
    const checkDate = new Date(fromDate);
    
    // Look ahead up to 14 days
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = this.getDayOfWeek(checkDate);
      const daySchedule = businessHours.schedule[dayOfWeek];
      const dateString = this.formatDate(checkDate);

      if (daySchedule && daySchedule.enabled && !businessHours.holidays.includes(dateString)) {
        const businessStart = new Date(checkDate);
        const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
        businessStart.setHours(startHour, startMinute, 0, 0);

        if (businessStart > fromDate) {
          return businessStart;
        }
      }

      checkDate.setDate(checkDate.getDate() + 1);
      checkDate.setHours(0, 0, 0, 0);
    }

    // Fallback
    const fallback = new Date(fromDate);
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(9, 0, 0, 0);
    return fallback;
  }

  private findPreviousBusinessHour(businessHours: BusinessHours, fromDate: Date): Date {
    const checkDate = new Date(fromDate);
    
    // Look back up to 14 days
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = this.getDayOfWeek(checkDate);
      const daySchedule = businessHours.schedule[dayOfWeek];
      const dateString = this.formatDate(checkDate);

      if (daySchedule && daySchedule.enabled && !businessHours.holidays.includes(dateString)) {
        const businessEnd = new Date(checkDate);
        const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
        businessEnd.setHours(endHour, endMinute, 0, 0);

        if (businessEnd < fromDate) {
          return businessEnd;
        }
      }

      checkDate.setDate(checkDate.getDate() - 1);
      checkDate.setHours(23, 59, 59, 999);
    }

    // Fallback
    const fallback = new Date(fromDate);
    fallback.setDate(fallback.getDate() - 1);
    fallback.setHours(17, 0, 0, 0);
    return fallback;
  }

  private findNextBusinessDay(businessHours: BusinessHours, fromDate: Date): Date {
    const checkDate = new Date(fromDate);
    checkDate.setDate(checkDate.getDate() + 1);
    checkDate.setHours(0, 0, 0, 0);

    // Look ahead up to 14 days
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = this.getDayOfWeek(checkDate);
      const daySchedule = businessHours.schedule[dayOfWeek];
      const dateString = this.formatDate(checkDate);

      if (daySchedule && daySchedule.enabled && !businessHours.holidays.includes(dateString)) {
        const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
        checkDate.setHours(startHour, startMinute, 0, 0);
        return checkDate;
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    // Fallback
    const fallback = new Date(fromDate);
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(9, 0, 0, 0);
    return fallback;
  }

  private getDayOfWeek(date: Date): keyof WeeklySchedule {
    const days: (keyof WeeklySchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5); // HH:mm format
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD format
  }

  private mapToBusinessHours(businessHours: any): BusinessHours {
    return {
      id: businessHours.id,
      tenantId: businessHours.tenantId,
      timezone: businessHours.timezone,
      schedule: businessHours.schedule,
      holidays: businessHours.holidays,
      isActive: businessHours.isActive,
      createdAt: businessHours.createdAt,
      updatedAt: businessHours.updatedAt,
    };
  }
}