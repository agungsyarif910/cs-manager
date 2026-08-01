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

// PATCH: Update conversation status/handlerType (AI ↔ Human toggle)
export async function PATCH(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { id, status, handlerType } = await request.json();
    if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

    const updateData: any = {};
    if (status) updateData.status = status;
    if (handlerType) updateData.handlerType = handlerType;

    const updated = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: { contact: true }
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      status: updated.status,
      handlerType: updated.handlerType,
      customer: (updated as any).contact?.name
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
