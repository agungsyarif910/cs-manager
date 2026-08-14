import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: List audit logs with optional filters
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = { companyId: user.companyId };
    if (action) where.action = action;

    // Date range filter
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });

    return NextResponse.json(logs.map((log: any) => ({
      id: log.id,
      timestamp: log.createdAt,
      user: log.user?.name || 'System',
      userEmail: log.user?.email || '',
      userRole: log.user?.role || '',
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress || '-',
      userAgent: log.userAgent || '',
    })));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
