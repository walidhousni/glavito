import { Controller, Get, Post, Body, Query, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CrmSearchService, SearchFilters } from './crm-search.service';
import { SearchRequestDto, SaveSearchRequestDto } from './dto/crm-search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles } from '@glavito/shared-auth';

// DTOs moved to ./dto/crm-search.dto.ts

@ApiTags('CRM - Advanced Search')
@Controller('crm/search')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CrmSearchController {
  constructor(private readonly searchService: CrmSearchService) {}

  @Post()
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Perform advanced search across CRM entities' })
  @ApiResponse({ status: 200, description: 'Search results with facets and pagination' })
  async search(@Req() req: any, @Body() searchRequest: SearchRequestDto) {
    const tenantId = req?.user?.tenantId;
    const userId = req?.user?.id;

    // Convert request to SearchFilters
    const filters: SearchFilters = {
      query: searchRequest.query,
      semantic: searchRequest.semantic,
      entities: searchRequest.entities as any,
      dateFrom: searchRequest.dateFrom ? new Date(searchRequest.dateFrom) : undefined,
      dateTo: searchRequest.dateTo ? new Date(searchRequest.dateTo) : undefined,
      dateField: searchRequest.dateField as any,
      leadStatus: searchRequest.leadStatus,
      dealStage: searchRequest.dealStage,
      dealPipeline: searchRequest.dealPipeline,
      minValue: searchRequest.minValue,
      maxValue: searchRequest.maxValue,
      currency: searchRequest.currency,
      minScore: searchRequest.minScore,
      maxScore: searchRequest.maxScore,
      assignedTo: searchRequest.assignedTo,
      unassigned: searchRequest.unassigned,
      companies: searchRequest.companies,
      sources: searchRequest.sources,
      tags: searchRequest.tags,
      customFields: searchRequest.customFields,
      page: searchRequest.page,
      limit: searchRequest.limit,
      sortBy: searchRequest.sortBy,
      sortOrder: searchRequest.sortOrder
    };

    const result = await this.searchService.search(tenantId, filters);

    // Log search event for analytics
    if (searchRequest.query) {
      try {
        await this.logSearchEvent(tenantId, userId, searchRequest.query, filters);
      } catch (error) {
        // Don't fail the search if logging fails
        console.warn('Failed to log search event:', error);
      }
    }

    return {
      success: true,
      data: result
    };
  }

  @Get('suggestions')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get search suggestions based on query' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search suggestions' })
  async getSuggestions(@Req() req: any, @Query('q') query: string) {
    const tenantId = req?.user?.tenantId;
    
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    // Get search history for suggestions
    const history = await this.searchService.getSearchHistory(tenantId, req?.user?.id, 5);
    
    // Generate AI-powered suggestions
    const suggestions = await this.searchService['generateSuggestions'](query);
    
    return {
      success: true,
      data: {
        history,
        suggestions,
        popular: [
          'high value leads',
          'recent deals',
          'unassigned customers',
          'hot prospects',
          'overdue tasks'
        ]
      }
    };
  }

  @Get('facets')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get available search facets' })
  @ApiResponse({ status: 200, description: 'Available search facets' })
  async getFacets(@Req() req: any) {
    const tenantId = req?.user?.tenantId;
    
    // Get facets for empty search (all available options)
    const result = await this.searchService.search(tenantId, {});
    
    return {
      success: true,
      data: result.facets
    };
  }

  @Get('history')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get user search history' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of history items to return' })
  @ApiResponse({ status: 200, description: 'Search history' })
  async getSearchHistory(@Req() req: any, @Query('limit') limit?: string) {
    const tenantId = req?.user?.tenantId;
    const userId = req?.user?.id;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    const history = await this.searchService.getSearchHistory(tenantId, userId, limitNum);
    
    return {
      success: true,
      data: history
    };
  }

  @Get('saved')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get saved searches' })
  @ApiResponse({ status: 200, description: 'Saved searches' })
  async getSavedSearches(@Req() req: any) {
    const tenantId = req?.user?.tenantId;
    const userId = req?.user?.id;
    
    const searches = await this.searchService.getSavedSearches(tenantId, userId);
    
    return {
      success: true,
      data: searches
    };
  }

  @Post('saved')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Save a search' })
  @ApiResponse({ status: 201, description: 'Search saved successfully' })
  async saveSearch(@Req() req: any, @Body() saveRequest: SaveSearchRequestDto) {
    const tenantId = req?.user?.tenantId;
    const userId = req?.user?.id;

    const filters: SearchFilters = {
      query: saveRequest.query,
      semantic: saveRequest.semantic,
      entities: saveRequest.entities as any,
      dateFrom: saveRequest.dateFrom ? new Date(saveRequest.dateFrom) : undefined,
      dateTo: saveRequest.dateTo ? new Date(saveRequest.dateTo) : undefined,
      dateField: saveRequest.dateField as any,
      leadStatus: saveRequest.leadStatus,
      dealStage: saveRequest.dealStage,
      dealPipeline: saveRequest.dealPipeline,
      minValue: saveRequest.minValue,
      maxValue: saveRequest.maxValue,
      currency: saveRequest.currency,
      minScore: saveRequest.minScore,
      maxScore: saveRequest.maxScore,
      assignedTo: saveRequest.assignedTo,
      unassigned: saveRequest.unassigned,
      companies: saveRequest.companies,
      sources: saveRequest.sources,
      tags: saveRequest.tags,
      customFields: saveRequest.customFields
    };

    await this.searchService.saveSearch(tenantId, userId, saveRequest.name, filters);
    
    return {
      success: true,
      message: 'Search saved successfully'
    };
  }

  @Delete('saved/:id')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Delete a saved search' })
  @ApiResponse({ status: 200, description: 'Search deleted successfully' })
  async deleteSavedSearch(@Req() req: any, @Param('id') searchId: string) {
    const tenantId = req?.user?.tenantId;
    const userId = req?.user?.id;
    
    await this.searchService.deleteSavedSearch(tenantId, userId, searchId);
    
    return {
      success: true,
      message: 'Search deleted successfully'
    };
  }

  @Get('analytics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get search analytics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze' })
  @ApiResponse({ status: 200, description: 'Search analytics' })
  async getSearchAnalytics(@Req() req: any, @Query('days') days?: string) {
    const tenantId = req?.user?.tenantId;
    const daysNum = days ? parseInt(days, 10) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    try {
      // Get search events for analytics
      const searchEvents = await this.searchService['prisma'].searchEvent.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          q: true,
          createdAt: true,
          userId: true
        }
      });

      // Analyze search patterns
      const analytics = {
        totalSearches: searchEvents.length,
        uniqueUsers: new Set(searchEvents.map(e => e.userId)).size,
        popularQueries: this.getPopularQueries(searchEvents),
        searchTrends: this.getSearchTrends(searchEvents, daysNum),
        averageSearchesPerDay: Math.round(searchEvents.length / daysNum * 10) / 10
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: true,
        data: {
          totalSearches: 0,
          uniqueUsers: 0,
          popularQueries: [],
          searchTrends: [],
          averageSearchesPerDay: 0
        }
      };
    }
  }

  private async logSearchEvent(tenantId: string, userId: string, query: string, filters: SearchFilters) {
    try {
      await this.searchService['prisma'].searchEvent.create({
        data: {
          tenantId,
          userId,
          q: query,
          filters: filters as any
        }
      });
    } catch (error) {
      // Silently fail - don't break search functionality
      console.warn('Failed to log search event:', error);
    }
  }

  private getPopularQueries(searchEvents: any[]): Array<{ query: string; count: number }> {
    const queryCounts = new Map<string, number>();
    
    searchEvents.forEach(event => {
      if (event.q) {
        const query = event.q.toLowerCase().trim();
        queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
      }
    });

    return Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getSearchTrends(searchEvents: any[], days: number): Array<{ date: string; count: number }> {
    const trends = new Map<string, number>();
    
    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends.set(dateStr, 0);
    }
    
    // Count searches per day
    searchEvents.forEach(event => {
      const dateStr = event.createdAt.toISOString().split('T')[0];
      if (trends.has(dateStr)) {
        trends.set(dateStr, trends.get(dateStr)! + 1);
      }
    });

    return Array.from(trends.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
