import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    label?: string;
    tag?: string;
  }) {
    const { page = 1, limit = 20, search, status, label, tag } = params;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.ContactWhereInput = {
      companyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(label && { labels: { has: label } }),
      ...(tag && { tags: { has: tag } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { conversations: true } } },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findById(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, companyId },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(companyId: string, data: {
    name?: string;
    phone: string;
    email?: string;
    labels?: string[];
    tags?: string[];
    status?: string;
    notes?: string;
    customFields?: any;
  }) {
    return this.prisma.contact.create({
      data: { ...data, companyId },
    });
  }

  async update(companyId: string, id: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    labels?: string[];
    tags?: string[];
    status?: string;
    notes?: string;
    customFields?: any;
  }) {
    await this.findById(companyId, id);
    return this.prisma.contact.update({ where: { id }, data });
  }

  async delete(companyId: string, id: string) {
    await this.findById(companyId, id);
    return this.prisma.contact.delete({ where: { id } });
  }
}
