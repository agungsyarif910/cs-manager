import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.workflow.findMany({ where: { companyId } });
  }
}
