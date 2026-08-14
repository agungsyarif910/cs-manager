import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: Recent inbound messages (unread notifications)
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent inbound messages from the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const messages = await prisma.message.findMany({
      where: {
        direction: 'INBOUND',
        createdAt: { gte: since },
        conversation: { companyId: user.companyId },
      },
      include: {
        conversation: {
          include: {
            contact: { select: { name: true, phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 20),
    });

    return NextResponse.json(messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content?.substring(0, 80) || '',
      createdAt: msg.createdAt,
      conversationId: msg.conversationId,
      contactName: msg.conversation?.contact?.name || 'Unknown',
      contactPhone: msg.conversation?.contact?.phone || '',
      status: msg.conversation?.status || '',
    })));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
