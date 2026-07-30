import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeBaseDto } from './dto/knowledge-base.dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateKnowledgeBaseDto) {
    return this.prisma.knowledgeBase.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        sourceType: dto.sourceType || 'DOCUMENT',
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.knowledgeBase.findMany({ where: { companyId } });
  }

  async findById(companyId: string, id: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id, companyId },
    });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    return kb;
  }
}
