import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const user = getUser(request);

    if (user) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
      const userAgent = request.headers.get('user-agent') || '';

      await prisma.auditLog.create({
        data: {
          userId: user.sub,
          companyId: user.companyId,
          action: 'LOGOUT',
          resource: 'Auth',
          details: { email: user.email, role: user.role },
          ipAddress: ip,
          userAgent,
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Logged out' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
