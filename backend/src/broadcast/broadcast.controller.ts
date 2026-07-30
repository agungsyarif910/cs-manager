import { Controller, Get, UseGuards } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentCompany } from '../common/decorators/company.decorator';

@UseGuards(JwtAuthGuard)
@Controller('broadcast')
export class BroadcastController {
  constructor(private readonly service: BroadcastService) {}

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.service.findAll(companyId);
  }
}
