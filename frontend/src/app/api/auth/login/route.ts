import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cs-manager-jwt-secret-2026-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });

    const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return NextResponse.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId }
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
