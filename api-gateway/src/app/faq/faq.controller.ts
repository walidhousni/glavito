import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FaqService } from './faq.service';

@ApiTags('FAQ')
@Controller('faq')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  create(@Req() req: any, @Body() createFaqDto: any) {
    const tenantId = req.user?.tenantId as string
    return this.faqService.create(tenantId, createFaqDto);
  }

  @Get()
  findAll(@Req() req: any) {
    const tenantId = req.user?.tenantId as string
    return this.faqService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string
    return this.faqService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateFaqDto: any) {
    const tenantId = req.user?.tenantId as string
    return this.faqService.update(tenantId, id, updateFaqDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string
    return this.faqService.remove(tenantId, id);
  }
}