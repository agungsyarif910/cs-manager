import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderDto } from './dto/ai-provider.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AiProviderService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async create(companyId: string, dto: AiProviderDto) {
    // Note: Use crypto util for real encryption of apiKey
    return this.prisma.aiProvider.create({
      data: {
        companyId,
        name: dto.name,
        baseUrl: dto.baseUrl,
        apiKeyEncrypted: dto.apiKey,
        model: dto.model,
        temperature: dto.temperature,
        topP: dto.topP,
      }
    });
  }

  async findAll(companyId: string) {
    return this.prisma.aiProvider.findMany({ where: { companyId } });
  }

  async findById(companyId: string, id: string) {
    const provider = await this.prisma.aiProvider.findFirst({
      where: { id, companyId }
    });
    if (!provider) throw new NotFoundException('AI Provider not found');
    return provider;
  }
}
