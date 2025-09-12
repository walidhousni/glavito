/**
 * Configuration Controller
 * Handles all platform configuration API endpoints
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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

// Custom interface to replace Express.Multer.File
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@ApiTags('configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding/configuration')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  // Organization Configuration
  @Get('organization')
  @ApiOperation({ summary: 'Get organization configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization configuration retrieved successfully',
  })
  async getOrganizationConfig(@Request() req: any) {
    const { tenantId } = req.user;
    return this.configurationService.getOrganizationConfig(tenantId);
  }

  @Put('organization')
  @Roles('admin')
  @ApiOperation({ summary: 'Update organization configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization configuration updated successfully',
  })
  async updateOrganizationConfig(
    @Request() req: any,
    @Body() config: any
  ) {
    const { tenantId } = req.user;
    return this.configurationService.updateOrganizationConfig(tenantId, config);
  }

  @Post('organization/logo')
  @Roles('admin')
  @ApiOperation({ summary: 'Upload organization logo' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Logo uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Request() req: any,
    @UploadedFile() file: MulterFile
  ) {
    const { tenantId } = req.user;
    return this.configurationService.uploadLogo(tenantId, file);
  }

  // Branding Configuration
  @Get('branding')
  @ApiOperation({ summary: 'Get branding configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Branding configuration retrieved successfully',
  })
  async getBrandingConfig(@Request() req: any) {
    const { tenantId } = req.user;
    return this.configurationService.getBrandingConfig(tenantId);
  }

  @Put('branding')
  @Roles('admin')
  @ApiOperation({ summary: 'Update branding configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Branding configuration updated successfully',
  })
  async updateBrandingConfig(
    @Request() req: any,
    @Body() config: any
  ) {
    const { tenantId } = req.user;
    return this.configurationService.updateBrandingConfig(tenantId, config);
  }

  @Get('branding/preview')
  @ApiOperation({ summary: 'Get branding preview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Branding preview generated successfully',
  })
  async getBrandingPreview(@Request() req: any) {
    const { tenantId } = req.user;
    return this.configurationService.generateBrandingPreview(tenantId);
  }

  // Custom Fields Configuration
  @Get('custom-fields')
  @ApiOperation({ summary: 'Get custom fields configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom fields retrieved successfully',
  })
  async getCustomFields(@Request() req: any) {
    const { tenantId } = req.user;
    return this.configurationService.getCustomFields(tenantId);
  }

  @Post('custom-fields')
  @Roles('admin')
  @ApiOperation({ summary: 'Create custom field' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Custom field created successfully',
  })
  async createCustomField(
    @Request() req: any,
    @Body() fieldConfig: any
  ) {
    const { tenantId } = req.user;
    return this.configurationService.createCustomField(tenantId, fieldConfig);
  }

  @Put('custom-fields/:fieldId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update custom field' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom field updated successfully',
  })
  async updateCustomField(
    @Request() req: any,
    @Param('fieldId') fieldId: string,
    @Body() fieldConfig: any
  ) {
    const { tenantId } = req.user;
    return this.configurationService.updateCustomField(tenantId, fieldId, fieldConfig);
  }

  @Delete('custom-fields/:fieldId')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete custom field' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Custom field deleted successfully',
  })
  async deleteCustomField(
    @Request() req: any,
    @Param('fieldId') fieldId: string
  ) {
    const { tenantId } = req.user;
    await this.configurationService.deleteCustomField(tenantId, fieldId);
  }

  // Configuration Validation
  @Post('validate')
  @Roles('admin')
  @ApiOperation({ summary: 'Validate configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration validated successfully',
  })
  async validateConfiguration(
    @Request() req: any,
    @Body() config: any
  ) {
    const { tenantId } = req.user;
    return this.configurationService.validateConfiguration(tenantId, config);
  }

  // Configuration Export/Import
  @Get('export')
  @Roles('admin')
  @ApiOperation({ summary: 'Export configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration exported successfully',
  })
  async exportConfiguration(@Request() req: any) {
    const { tenantId } = req.user;
    return this.configurationService.exportConfiguration(tenantId);
  }

  @Post('import')
  @Roles('admin')
  @ApiOperation({ summary: 'Import configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration imported successfully',
  })
  async importConfiguration(
    @Request() req: any,
    @Body() config: any
  ) {
    const { tenantId } = req.user;
    return this.configurationService.importConfiguration(tenantId, config);
  }
}