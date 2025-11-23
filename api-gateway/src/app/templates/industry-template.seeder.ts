import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { industriesData } from './data/industries-data';

@Injectable()
export class IndustryTemplateSeeder {
  private readonly logger = new Logger(IndustryTemplateSeeder.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Seed all industry templates
   */
  async seedAll() {
    this.logger.log('Starting industry template seeding...');
    
    let created = 0;
    let skipped = 0;

    for (const industry of industriesData) {
      try {
        const existing = await this.db.industryTemplate.findFirst({
          where: {
            industry: industry.industry,
            name: industry.name
          }
        });

        if (existing) {
          this.logger.log(`Template ${industry.name} already exists, skipping`);
          skipped++;
          continue;
        }

        await this.db.industryTemplate.create({
          data: industry as any
        });

        this.logger.log(`Created template: ${industry.name}`);
        created++;
      } catch (error) {
        this.logger.error(`Failed to create template ${industry.name}: ${error}`);
      }
    }

    this.logger.log(`Seeding complete. Created: ${created}, Skipped: ${skipped}`);
    
    return { created, skipped };
  }

  /**
   * Seed templates for a specific industry
   */
  async seedIndustry(industry: string) {
    const templates = industriesData.filter(t => t.industry === industry);
    
    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      try {
        const existing = await this.db.industryTemplate.findFirst({
          where: {
            industry: template.industry,
            name: template.name
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.db.industryTemplate.create({
          data: template as any
        });

        created++;
      } catch (error) {
        this.logger.error(`Failed to create template ${template.name}: ${error}`);
      }
    }

    return { created, skipped };
  }

  /**
   * Clear all industry templates (use with caution!)
   */
  async clearAll() {
    this.logger.warn('Clearing all industry templates...');
    await this.db.industryTemplate.deleteMany({});
    this.logger.log('All templates cleared');
  }
}

