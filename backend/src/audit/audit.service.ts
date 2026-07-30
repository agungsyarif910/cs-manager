import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string,
    companyId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        companyId,
        action,
        resource,
        resourceId,
        details: details || {},
        ipAddress,
        userAgent
      }
    });
  }

  async findAll(companyId: string, params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 50, userId, action, resource, startDate, endDate } = params;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(userId && { userId }),
      ...(action && { action }),
      ...(resource && { resource }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      })
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }
}
