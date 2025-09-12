import { Controller, Get, Query, UseGuards, Req, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, PermissionsGuard } from '@glavito/shared-auth';
import { Roles, Permissions } from '@glavito/shared-auth';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get('federated')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Federated search across tickets, customers, and knowledge' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Maximum number of results', required: false, type: Number })
  @Header('Cache-Control', 'private, max-age=30')
  async federated(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    const searchLimit = limit ? parseInt(limit, 10) : 10;
    return this.service.federated(tenantId, q || '', Math.min(searchLimit, 50));
  }

  @Get('suggestions')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'q', description: 'Partial search query', required: true })
  @Header('Cache-Control', 'private, max-age=60')
  async suggestions(@Query('q') q: string, @Req() req: unknown) {
    const tenantId = req?.user?.tenantId as string;
    
    if (!q || q.length < 2) {
      return { suggestions: [] };
    }

    // Get quick suggestions from recent searches or common terms
    const results = await this.service.federated(tenantId, q, 5);
    return {
      suggestions: results.suggestions || [],
    };
  }
}


