import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LocalizationService, type LocaleCode, type CurrencyCode } from './localization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, CurrentTenant } from '@glavito/shared-auth';

@ApiTags('Localization')
@Controller('localization')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocalizationController {
  constructor(private readonly service: LocalizationService) {}

  @Get('supported')
  @ApiOperation({ summary: 'List supported locales' })
  supported() {
    return this.service.getSupported();
  }

  @Get('supported-currencies')
  @ApiOperation({ summary: 'List supported currencies' })
  supportedCurrencies() {
    return this.service.getSupportedCurrencies();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get tenant locale' })
  async myLocale(@CurrentTenant() tenantId: string) {
    return { locale: await this.service.getTenantLocale(tenantId) };
  }

  @Patch('me')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tenant locale' })
  async setMyLocale(@CurrentTenant() tenantId: string, @Body() body: { locale: LocaleCode }) {
    return this.service.setTenantLocale(tenantId, body.locale);
  }

  @Get('currency')
  @ApiOperation({ summary: 'Get tenant currency' })
  async myCurrency(@CurrentTenant() tenantId: string) {
    return { currency: await this.service.getTenantCurrency(tenantId) };
  }

  @Patch('currency')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tenant currency' })
  async setMyCurrency(@CurrentTenant() tenantId: string, @Body() body: { currency: CurrencyCode }) {
    return this.service.setTenantCurrency(tenantId, body.currency);
  }
}


