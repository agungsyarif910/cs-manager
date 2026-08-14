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

// DELETE: Delete one or many conversations (with all messages)
export async function DELETE(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: 'ids (array) wajib diisi' }, { status: 400 });
    }

    // Verify all conversations belong to this company
    const conversations = await prisma.conversation.findMany({
      where: { id: { in: ids }, companyId: user.companyId },
      select: { id: true }
    });
    const validIds = conversations.map(c => c.id);

    if (validIds.length === 0) {
      return NextResponse.json({ message: 'Tidak ada percakapan yang ditemukan' }, { status: 404 });
    }

    // Delete messages first (foreign key constraint)
    await prisma.message.deleteMany({
      where: { conversationId: { in: validIds } }
    });

    // Delete conversations
    const result = await prisma.conversation.deleteMany({
      where: { id: { in: validIds } }
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `${result.count} percakapan berhasil dihapus`
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
