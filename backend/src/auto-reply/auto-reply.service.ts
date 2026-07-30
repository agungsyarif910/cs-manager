import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TriggerType } from '@prisma/client';

@Injectable()
export class AutoReplyService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.autoReply.findMany({
      where: { companyId, isActive: true }
    });
  }

  async findById(companyId: string, id: string) {
    const autoReply = await this.prisma.autoReply.findFirst({
      where: { id, companyId }
    });
    if (!autoReply) throw new NotFoundException('Auto-reply not found');
    return autoReply;
  }

  async create(companyId: string, data: any) {
    return this.prisma.autoReply.create({
      data: { ...data, companyId }
    });
  }

  async update(companyId: string, id: string, data: any) {
    await this.findById(companyId, id);
    return this.prisma.autoReply.update({
      where: { id },
      data
    });
  }

  async delete(companyId: string, id: string) {
    await this.findById(companyId, id);
    return this.prisma.autoReply.delete({ where: { id } });
  }

  async shouldAutoReply(companyId: string, triggerType: string): Promise<boolean> {
    const autoReplies = await this.prisma.autoReply.findMany({
      where: { companyId, triggerType: triggerType as TriggerType, isActive: true }
    });
    
    if (autoReplies.length === 0) return false;
    return true;
  }

  async getReplyForTrigger(companyId: string, triggerType: string) {
    const autoReply = await this.prisma.autoReply.findFirst({
      where: { companyId, triggerType: triggerType as TriggerType, isActive: true }
    });
    
    if (!autoReply) return null;
    
    return {
      message: autoReply.message,
      delay: autoReply.delayMs || 0
    };
  }
}
