import { Controller, Get, Query, Param, Post, Body, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import { Roles, Permissions, RolesGuard, PermissionsGuard } from '@glavito/shared-auth';

@ApiTags('Marketplace')
@Controller('marketplace')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class MarketplaceController {
  constructor(private readonly svc: MarketplaceService) {}

  @Get()
  @Roles('admin', 'agent')
  @Permissions('marketplace.read')
  list(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('type') type?: string,
    @Query('premium') premium?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.list({ search, category, tag, type, premium: premium === 'true' ? true : premium === 'false' ? false : undefined as any, sort, page, limit });
  }

  @Get(':slug')
  @Roles('admin', 'agent')
  @Permissions('marketplace.read')
  get(@Param('slug') slug: string) {
    return this.svc.getBySlug(slug);
  }

  @Get('installed/list')
  @Roles('admin')
  @Permissions('marketplace.manage')
  installed(@Req() req: any) {
    return this.svc.listInstalled(req?.user?.tenantId);
  }

  @Post(':slug/install')
  @Roles('admin')
  @Permissions('marketplace.manage')
  install(@Param('slug') slug: string, @Req() req: any, @Body() body?: { configuration?: Record<string, unknown> }) {
    return this.svc.install(req?.user?.tenantId, slug, req?.user?.id, body?.configuration);
  }

  // Seed demo marketplace modules (admin only)
  @Post('seed/demo')
  @Roles('admin')
  @Permissions('marketplace.manage')
  seedDemo(@Req() req: any) {
    return this.svc.seedDemo(req?.user?.tenantId, req?.user?.id);
  }

  @Patch('installed/:id')
  @Roles('admin')
  @Permissions('marketplace.manage')
  updateInstallation(@Param('id') id: string, @Req() req: any, @Body() body: { status?: 'installed' | 'enabled' | 'disabled'; configuration?: Record<string, unknown> }) {
    return this.svc.updateInstallation(req?.user?.tenantId, id, body);
  }

  @Delete('installed/:id')
  @Roles('admin')
  @Permissions('marketplace.manage')
  uninstall(@Param('id') id: string, @Req() req: any) {
    return this.svc.uninstall(req?.user?.tenantId, id);
  }

  @Post(':slug/reviews')
  @Roles('admin', 'agent')
  @Permissions('marketplace.read')
  async review(@Param('slug') slug: string, @Req() req: any, @Body() body: { rating: number; comment?: string }) {
    const item = await this.svc.getBySlug(slug);
    return this.svc.addReview(item?.id as string, req?.user?.id, body.rating, body.comment);
  }
}


