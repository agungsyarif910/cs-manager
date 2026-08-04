import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // ─── Core Stats ─────────────────────────────────
    const [
      totalMessages,
      todayMessages,
      totalContacts,
      activeConversations,
      aiMessages,
      humanMessages,
      thisWeekMessages,
      lastWeekMessages,
    ] = await Promise.all([
      prisma.message.count({ where: { conversation: { companyId } } }),
      prisma.message.count({ where: { conversation: { companyId }, createdAt: { gte: today } } }),
      prisma.contact.count({ where: { companyId } }),
      prisma.conversation.count({ where: { companyId, status: { in: ['ACTIVE', 'AI_HANDLING', 'HUMAN_HANDLING'] } } }),
      prisma.message.count({ where: { conversation: { companyId }, isFromAi: true } }),
      prisma.message.count({ where: { conversation: { companyId }, isFromAi: false, direction: 'OUTBOUND' } }),
      prisma.message.count({ where: { conversation: { companyId }, createdAt: { gte: weekAgo } } }),
      prisma.message.count({ where: { conversation: { companyId }, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    ]);

    // AI resolution rate
    const totalOutbound = aiMessages + humanMessages;
    const aiRate = totalOutbound > 0 ? ((aiMessages / totalOutbound) * 100).toFixed(1) : '0';

    // Week-over-week growth
    const weekGrowth = lastWeekMessages > 0
      ? (((thisWeekMessages - lastWeekMessages) / lastWeekMessages) * 100).toFixed(1)
      : '0';

    // ─── Daily Chart Data (last 7 days) ─────────────────────────────────
    const dailyData = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayAi, dayHuman] = await Promise.all([
        prisma.message.count({
          where: { conversation: { companyId }, isFromAi: true, createdAt: { gte: dayStart, lte: dayEnd } }
        }),
        prisma.message.count({
          where: { conversation: { companyId }, isFromAi: false, direction: 'OUTBOUND', createdAt: { gte: dayStart, lte: dayEnd } }
        }),
      ]);

      dailyData.push({
        date: dayNames[dayStart.getDay()],
        ai: dayAi,
        human: dayHuman,
        messages: dayAi + dayHuman,
      });
    }

    // ─── Pie Data ─────────────────────────────────
    const [aiHandled, humanHandled, escalated] = await Promise.all([
      prisma.conversation.count({ where: { companyId, status: 'AI_HANDLING' } }),
      prisma.conversation.count({ where: { companyId, status: 'HUMAN_HANDLING' } }),
      prisma.conversation.count({ where: { companyId, status: 'NEED_HUMAN' } }),
    ]);

    const pieData = [
      { name: 'AI Handled', value: aiHandled, color: '#10b981' },
      { name: 'Human Handled', value: humanHandled, color: '#6366f1' },
      { name: 'Escalated', value: escalated, color: '#f59e0b' },
    ];

    // ─── Recent Activity (last 10 messages) ─────────────────────────────────
    const recentMessages = await prisma.message.findMany({
      where: { conversation: { companyId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        conversation: {
          include: { contact: { select: { name: true, phone: true } } }
        }
      }
    });

    const recentActivity = recentMessages.map((msg: any) => {
      const minutesAgo = Math.round((now.getTime() - new Date(msg.createdAt).getTime()) / 60000);
      let timeStr = '';
      if (minutesAgo < 1) timeStr = 'Baru saja';
      else if (minutesAgo < 60) timeStr = `${minutesAgo} menit lalu`;
      else if (minutesAgo < 1440) timeStr = `${Math.floor(minutesAgo / 60)} jam lalu`;
      else timeStr = `${Math.floor(minutesAgo / 1440)} hari lalu`;

      return {
        id: msg.id,
        type: msg.direction === 'INBOUND' ? 'incoming' : msg.isFromAi ? 'ai_reply' : 'human_reply',
        message: msg.direction === 'INBOUND'
          ? `Pesan masuk: "${(msg.content || '').slice(0, 60)}${(msg.content || '').length > 60 ? '...' : ''}"`
          : msg.isFromAi
            ? `AI membalas: "${(msg.content || '').slice(0, 60)}${(msg.content || '').length > 60 ? '...' : ''}"`
            : `CS membalas: "${(msg.content || '').slice(0, 60)}${(msg.content || '').length > 60 ? '...' : ''}"`,
        time: timeStr,
        user: msg.conversation?.contact?.name || msg.conversation?.contact?.phone || 'Unknown',
      };
    });

    return NextResponse.json({
      totalMessages,
      todayMessages,
      totalContacts,
      activeConversations,
      aiMessages,
      humanMessages,
      aiRate,
      weekGrowth,
      dailyData,
      pieData,
      recentActivity,
    });
  } catch (e: any) {
    console.error('Dashboard stats error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
