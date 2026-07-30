import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentCompany } from '../common/decorators/company.decorator';

@UseGuards(JwtAuthGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.service.findAll(companyId);
  }
}
