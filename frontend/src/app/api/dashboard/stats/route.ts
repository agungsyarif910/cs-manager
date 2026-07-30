import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();
  try {
    const companyId = user.companyId;
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalMessages, todayMessages, totalContacts, activeConversations] = await Promise.all([
      prisma.message.count({ where: { conversation: { companyId } } }),
      prisma.message.count({ where: { conversation: { companyId }, createdAt: { gte: today } } }),
      prisma.contact.count({ where: { companyId } }),
      prisma.conversation.count({ where: { companyId, status: { in: ['ACTIVE', 'AI_HANDLING', 'HUMAN_HANDLING'] } } }),
    ]);
    return NextResponse.json({ totalMessages, todayMessages, totalContacts, activeConversations, aiSuccessRate: 0 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
