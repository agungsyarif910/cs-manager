import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';
import bcrypt from 'bcryptjs';

// GET: List all users for the company
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const users = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Hanya Owner yang bisa menambah user' }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();

    if (role === 'OWNER') {
      return NextResponse.json({ message: 'Tidak bisa menambah user dengan role Owner' }, { status: 400 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, dan password wajib diisi' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: 'Email sudah terdaftar' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'VIEWER',
        companyId: user.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// PATCH: Update user (name, role, isActive, password)
export async function PATCH(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Hanya Owner yang bisa mengedit user' }, { status: 403 });
    }

    const { id, name, email, role, isActive, password } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'id wajib diisi' }, { status: 400 });
    }

    // Verify user belongs to same company
    const target = await prisma.user.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!target) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// DELETE: Delete a user
export async function DELETE(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Hanya Owner yang bisa menghapus user' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'id wajib diisi' }, { status: 400 });
    }

    // Prevent deleting yourself
    if (id === user.userId) {
      return NextResponse.json({ message: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
    }

    // Verify user belongs to same company
    const target = await prisma.user.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!target) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'User berhasil dihapus' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
