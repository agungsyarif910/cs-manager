import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({ contacts: [], conversations: [] });
    }

    // Search contacts (case-insensitive via raw SQL-like approach)
    const contacts = await prisma.contact.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { name: { contains: q, mode: 'insensitive' as any } },
          { phone: { contains: q } },
        ]
      },
      select: { id: true, name: true, phone: true, email: true },
      take: 5,
    });

    // Search conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        companyId: user.companyId,
        contact: {
          OR: [
            { name: { contains: q, mode: 'insensitive' as any } },
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

    const result = {
      contacts: contacts.map((c: any) => ({
        id: c.id,
        name: c.name || c.phone,
        phone: c.phone,
        email: c.email || '',
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
    };

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Search error:', e.message);
    
    // Fallback: try without companyId filter
    try {
      const q2 = new URL(request.url).searchParams.get('q')?.trim() || '';
      const contacts = await prisma.contact.findMany({
        where: {
          OR: [
            { name: { contains: q2, mode: 'insensitive' as any } },
            { phone: { contains: q2 } },
          ]
        },
        select: { id: true, name: true, phone: true, email: true },
        take: 5,
      });

      return NextResponse.json({
        contacts: contacts.map((c: any) => ({
          id: c.id, name: c.name || c.phone, phone: c.phone, email: c.email || '', type: 'contact',
        })),
        conversations: [],
      });
    } catch (e2: any) {
      return NextResponse.json({ message: e2.message, contacts: [], conversations: [] });
    }
  }
}
