import { Controller, Post, Delete, Param, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@glavito/shared-auth';
import { IndustryTemplateSeeder } from './industry-template.seeder';

/**
 * Controller for seeding industry templates
 * Only accessible by super admins in development/staging
 */
@Controller('templates/seed')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class TemplatesSeedController {
  private readonly logger = new Logger(TemplatesSeedController.name);

  constructor(private readonly seeder: IndustryTemplateSeeder) {}

  /**
   * Seed all industry templates
   */
  @Post('all')
  async seedAll() {
    this.logger.log('Seeding all industry templates');
    const result = await this.seeder.seedAll();
    return {
      message: 'Industry templates seeding completed',
      ...result
    };
  }

  /**
   * Seed templates for a specific industry
   */
  @Post('industry/:industry')
  async seedIndustry(@Param('industry') industry: string) {
    this.logger.log(`Seeding templates for industry: ${industry}`);
    const result = await this.seeder.seedIndustry(industry);
    return {
      message: `Templates for ${industry} industry seeded`,
      ...result
    };
  }

  /**
   * Clear all industry templates (use with extreme caution!)
   */
  @Delete('all')
  async clearAll() {
    if (process.env.NODE_ENV === 'production') {
      return {
        error: 'Cannot clear templates in production environment'
      };
    }

    this.logger.warn('Clearing all industry templates');
    await this.seeder.clearAll();
    return {
      message: 'All industry templates cleared'
    };
  }
}

