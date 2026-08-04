import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: List all contacts with search & pagination
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = { companyId: user.companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Create or update a contact (upsert by phone)
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { name, phone, email, labels, tags, status } = body;

    if (!phone) {
      return NextResponse.json({ message: 'Phone is required' }, { status: 400 });
    }

    // Upsert: update if phone exists, create if not
    const existing = await prisma.contact.findFirst({
      where: { companyId: user.companyId, phone },
    });

    let contact;
    if (existing) {
      contact = await prisma.contact.update({
        where: { id: existing.id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(labels && { labels }),
          ...(tags && { tags }),
          ...(status && { status }),
        },
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          companyId: user.companyId,
          name: name || phone,
          phone,
          email: email || null,
          labels: labels || [],
          tags: tags || [],
          status: status || 'ACTIVE',
        },
      });
    }

    return NextResponse.json(contact);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// PATCH: Update contact by id
export async function PATCH(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { id, name, phone, email, labels, tags, status } = body;

    if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) return NextResponse.json({ message: 'Contact not found' }, { status: 404 });

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(labels !== undefined && { labels }),
        ...(tags !== undefined && { tags }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json(contact);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// DELETE: Delete contact by id
export async function DELETE(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) return NextResponse.json({ message: 'Contact not found' }, { status: 404 });

    await prisma.contact.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
