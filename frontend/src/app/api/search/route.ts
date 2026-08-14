import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: Global search across contacts and conversations
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ contacts: [], conversations: [] });
    }

    const searchTerm = `%${q}%`;

    // Search contacts
    const contacts = await prisma.contact.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, name: true, phone: true, email: true },
      take: 5,
    });

    // Search conversations by contact name/phone
    const conversations = await prisma.conversation.findMany({
      where: {
        companyId: user.companyId,
        contact: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ]
        }
      },
      include: {
        contact: { select: { name: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      contacts: contacts.map((c: any) => ({
        id: c.id,
        name: c.name || c.phone,
        phone: c.phone,
        email: c.email,
        type: 'contact',
      })),
      conversations: conversations.map((c: any) => ({
        id: c.id,
        name: c.contact?.name || c.contact?.phone || 'Unknown',
        phone: c.contact?.phone || '',
        status: c.status,
        handlerType: c.handlerType,
        type: 'conversation',
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
