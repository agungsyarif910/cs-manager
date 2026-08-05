import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: List registrations with filters
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Auto-expire overdue registrations
    await prisma.registration.updateMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'WAITING_PAYMENT'] },
        paymentDeadline: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    const where: any = { companyId };
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { program: { contains: search, mode: 'insensitive' } },
      ];
    }

    const registrations = await prisma.registration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(registrations);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Create registration (called from webhook or manual)
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;
    const body = await request.json();
    const { name, phone, program, contactId, conversationId, deadlineHours = 24 } = body;

    if (!name || !phone || !program) {
      return NextResponse.json({ message: 'Nama, phone, dan program wajib diisi' }, { status: 400 });
    }

    const deadline = new Date();
    deadline.setHours(deadline.getHours() + deadlineHours);

    const registration = await prisma.registration.create({
      data: {
        companyId,
        contactId: contactId || null,
        conversationId: conversationId || null,
        name,
        phone,
        program,
        status: 'PENDING',
        paymentDeadline: deadline,
      },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// PATCH: Update registration status (confirm payment, cancel, extend deadline)
export async function PATCH(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;
    const body = await request.json();
    const { id, action, paymentNote, extendHours = 24 } = body;

    if (!id || !action) {
      return NextResponse.json({ message: 'id dan action wajib' }, { status: 400 });
    }

    const reg = await prisma.registration.findFirst({ where: { id, companyId } });
    if (!reg) return NextResponse.json({ message: 'Registrasi tidak ditemukan' }, { status: 404 });

    let updateData: any = {};

    switch (action) {
      case 'CONFIRM_PAID':
        updateData = { status: 'PAID', paidAt: new Date(), validatedBy: user.userId, paymentNote: paymentNote || null };
        break;
      case 'CANCEL':
        updateData = { status: 'CANCELLED' };
        break;
      case 'EXTEND_DEADLINE':
        const newDeadline = new Date();
        newDeadline.setHours(newDeadline.getHours() + extendHours);
        updateData = { paymentDeadline: newDeadline, status: 'WAITING_PAYMENT' };
        break;
      default:
        return NextResponse.json({ message: 'Action tidak valid' }, { status: 400 });
    }

    const updated = await prisma.registration.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// DELETE: Delete registration
export async function DELETE(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id wajib' }, { status: 400 });

    const reg = await prisma.registration.findFirst({ where: { id, companyId } });
    if (!reg) return NextResponse.json({ message: 'Tidak ditemukan' }, { status: 404 });

    await prisma.registration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
