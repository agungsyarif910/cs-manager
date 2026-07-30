import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsAppConfigService {
  constructor(private prisma: PrismaService) {}

  async findByCompany(companyId: string) {
    return this.prisma.whatsAppConfig.findMany({ where: { companyId } });
  }

  async findActive(companyId: string) {
    const config = await this.prisma.whatsAppConfig.findFirst({
      where: { companyId, isActive: true },
    });
    if (!config) throw new NotFoundException('Active WhatsApp config not found');
    return config;
  }
}
