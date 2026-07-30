import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiAgentDto } from './dto/ai-agent.dto';

@Injectable()
export class AiAgentService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: AiAgentDto) {
    return this.prisma.aiAgent.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        aiProviderId: dto.aiProviderId,
      }
    });
  }

  async findAll(companyId: string) {
    return this.prisma.aiAgent.findMany({ where: { companyId } });
  }
  
  async findById(companyId: string, id: string) {
    const agent = await this.prisma.aiAgent.findFirst({
      where: { id, companyId },
      include: { aiProvider: true }
    });
    if (!agent) throw new NotFoundException('AI Agent not found');
    return agent;
  }
}
