import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(companyId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalMessages, todayMessages, aiMessages, humanMessages, escalations, activeCustomers] = await Promise.all([
      this.prisma.message.count({
        where: { conversation: { companyId } },
      }),
      this.prisma.message.count({
        where: { conversation: { companyId }, createdAt: { gte: startOfToday } },
      }),
      this.prisma.message.count({
        where: { conversation: { companyId }, isFromAi: true },
      }),
      this.prisma.message.count({
        where: { conversation: { companyId }, isFromAi: false, direction: 'OUTBOUND' },
      }),
      this.prisma.conversation.count({
        where: { companyId, status: 'NEED_HUMAN' },
      }),
      this.prisma.conversation.count({
        where: { companyId, status: { in: ['ACTIVE', 'AI_HANDLING', 'HUMAN_HANDLING'] } },
      }),
    ]);

    const totalOutbound = aiMessages + humanMessages;
    const successRate = totalOutbound > 0 ? Math.round((aiMessages / totalOutbound) * 100) : 0;

    // Average response time (ms) from INBOUND to next OUTBOUND
    const avgResponseTime = await this.prisma.$queryRawUnsafe<{ avg: number }[]>(`
      SELECT AVG(EXTRACT(EPOCH FROM (outbound."createdAt" - inbound."createdAt")) * 1000) as avg
      FROM messages inbound
      JOIN LATERAL (
        SELECT "createdAt" FROM messages 
        WHERE "conversationId" = inbound."conversationId" 
        AND direction = 'OUTBOUND'
        AND "createdAt" > inbound."createdAt"
        ORDER BY "createdAt" ASC LIMIT 1
      ) outbound ON true
      JOIN conversations c ON inbound."conversationId" = c.id
      WHERE inbound.direction = 'INBOUND' AND c."companyId" = $1
    `, companyId);

    return {
      totalMessages,
      todayMessages,
      aiMessages,
      humanMessages,
      escalations,
      activeCustomers,
      successRate,
      avgResponseTime: avgResponseTime[0]?.avg || 0,
    };
  }

  async getDailyChart(companyId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.prisma.$queryRawUnsafe<{ date: string; total: number; ai: number; human: number }[]>(`
      SELECT 
        DATE(m."createdAt") as date,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE m."isFromAi" = true)::int as ai,
        COUNT(*) FILTER (WHERE m."isFromAi" = false AND m.direction = 'OUTBOUND')::int as human
      FROM messages m
      JOIN conversations c ON m."conversationId" = c.id
      WHERE c."companyId" = $1 AND m."createdAt" >= $2
      GROUP BY DATE(m."createdAt")
      ORDER BY date ASC
    `, companyId, startDate);

    return data;
  }

  async getMonthlyChart(companyId: string) {
    const data = await this.prisma.$queryRawUnsafe<{ month: string; total: number }[]>(`
      SELECT 
        TO_CHAR(m."createdAt", 'YYYY-MM') as month,
        COUNT(*)::int as total
      FROM messages m
      JOIN conversations c ON m."conversationId" = c.id
      WHERE c."companyId" = $1 AND m."createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(m."createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `, companyId);

    return data;
  }
}
