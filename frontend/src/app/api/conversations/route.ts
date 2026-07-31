import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: List conversations with latest message
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Get single conversation with messages
    if (id) {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          contact: true,
          messages: { orderBy: { createdAt: 'asc' } },
          assignedUser: true,
          agent: true,
        }
      });
      if (!conversation) return NextResponse.json({ message: 'Not found' }, { status: 404 });
      return NextResponse.json(conversation);
    }

    // List all conversations
    const conversations = await prisma.conversation.findMany({
      where: { companyId: user.companyId },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        assignedUser: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(conversations.map((c: any) => ({
      id: c.id,
      customer: c.contact?.name || 'Unknown',
      phone: c.contact?.phone || '',
      status: c.status,
      handlerType: c.handlerType,
      assignedTo: c.assignedUser?.name,
      lastMessage: c.messages[0]?.content || '',
      lastMessageAt: c.messages[0]?.createdAt,
      messageCount: c.messages.length,
      createdAt: c.createdAt,
    })));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
