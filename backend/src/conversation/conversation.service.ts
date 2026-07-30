import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConversationStatus } from '@prisma/client';

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    handlerType?: string;
    agentId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, handlerType, agentId, startDate, endDate, search } = params;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.ConversationWhereInput = {
      companyId,
      ...(status && { status: status as ConversationStatus }),
      ...(agentId && { agentId }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      }),
      ...(search && {
        contact: {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } }
          ]
        }
      })
    };

    if (handlerType) {
      if (handlerType === 'AI') {
        where.status = { in: ['AI_HANDLING' as ConversationStatus] };
      } else if (handlerType === 'HUMAN') {
        where.status = { in: ['HUMAN_HANDLING' as ConversationStatus, 'NEED_HUMAN' as ConversationStatus] };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          contact: true,
          assignedUser: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true } }
        }
      }),
      this.prisma.conversation.count({ where })
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findById(companyId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, companyId },
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async create(companyId: string, contactId: string) {
    return this.prisma.conversation.create({
      data: {
        companyId,
        contactId,
        status: 'ACTIVE'
      }
    });
  }

  async updateStatus(companyId: string, id: string, status: ConversationStatus) {
    await this.findById(companyId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { status }
    });
  }

  async assignToUser(companyId: string, id: string, userId: string) {
    await this.findById(companyId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { 
        assignedUserId: userId,
        status: 'HUMAN_HANDLING'
      }
    });
  }

  async releaseToAi(companyId: string, id: string) {
    await this.findById(companyId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { 
        assignedUserId: null,
        status: 'AI_HANDLING'
      }
    });
  }

  async getMessages(companyId: string, id: string, page: number = 1, limit: number = 50) {
    await this.findById(companyId, id);
    const skip = (Number(page) - 1) * Number(limit);
    
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.message.count({ where: { conversationId: id } })
    ]);

    return { 
      data: messages.reverse(), 
      total, 
      page: Number(page), 
      limit: Number(limit), 
      totalPages: Math.ceil(total / Number(limit)) 
    };
  }

  async addMessage(companyId: string, id: string, data: any) {
    await this.findById(companyId, id);
    return this.prisma.message.create({
      data: {
        ...data,
        conversationId: id
      }
    });
  }
}
