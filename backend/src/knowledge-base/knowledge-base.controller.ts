import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeBaseDto } from './dto/knowledge-base.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentCompany } from '../common/decorators/company.decorator';

@UseGuards(JwtAuthGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly service: KnowledgeBaseService) {}

  @Post()
  create(@Body() dto: CreateKnowledgeBaseDto, @CurrentCompany() companyId: string) {
    return this.service.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.service.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentCompany() companyId: string) {
    return this.service.findById(companyId, id);
  }
}
