import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: List broadcasts
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const broadcasts = await prisma.broadcast.findMany({
      where: { companyId: user.companyId },
      include: { template: { select: { name: true, content: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(broadcasts.map((b: any) => ({
      id: b.id,
      name: b.name,
      templateName: b.template?.name || '',
      templateContent: b.template?.content || '',
      status: b.status,
      totalCount: b.totalCount,
      successCount: b.successCount,
      failedCount: b.failedCount,
      progress: b.totalCount > 0 ? Math.round(((b.successCount + b.failedCount) / b.totalCount) * 100) : 0,
      scheduledAt: b.scheduledAt,
      createdAt: b.createdAt,
    })));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Create & send broadcast
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { name, message, contactIds } = await request.json();

    if (!name || !message || !contactIds?.length) {
      return NextResponse.json({ message: 'Nama, pesan, dan kontak wajib diisi' }, { status: 400 });
    }

    // Get WhatsApp config
    const waConfig = await prisma.whatsAppConfig.findFirst({
      where: { companyId: user.companyId, isActive: true },
    });

    if (!waConfig) {
      return NextResponse.json({ message: 'Konfigurasi WhatsApp belum diatur' }, { status: 400 });
    }

    // Get or create a broadcast template
    let template = await prisma.template.findFirst({
      where: { companyId: user.companyId, category: 'BROADCAST' },
    });

    if (!template) {
      template = await prisma.template.create({
        data: {
          name: 'Broadcast Template',
          category: 'BROADCAST',
          content: message,
          companyId: user.companyId,
        },
      });
    }

    // Get contacts
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, companyId: user.companyId },
      select: { id: true, name: true, phone: true },
    });

    if (contacts.length === 0) {
      return NextResponse.json({ message: 'Tidak ada kontak valid' }, { status: 400 });
    }

    // Create broadcast record
    const broadcast = await prisma.broadcast.create({
      data: {
        name,
        templateId: template.id,
        targets: contactIds,
        status: 'PROCESSING',
        totalCount: contacts.length,
        companyId: user.companyId,
      },
    });

    // Send messages in background
    let successCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        // Replace variables in message
        const personalizedMsg = message
          .replace(/\{\{nama\}\}/gi, contact.name || 'Kak')
          .replace(/\{\{phone\}\}/gi, contact.phone || '');

        const sendUrl = `${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`;
        const sendRes = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${waConfig.apiKeyEncrypted}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: contact.phone,
            type: 'text',
            text: { body: personalizedMsg },
          }),
        });

        const status = sendRes.ok ? 'SENT' : 'FAILED';
        const errorMsg = sendRes.ok ? null : `HTTP ${sendRes.status}`;

        await prisma.broadcastLog.create({
          data: {
            broadcastId: broadcast.id,
            contactId: contact.id,
            status,
            errorMessage: errorMsg,
            sentAt: sendRes.ok ? new Date() : null,
          },
        });

        if (sendRes.ok) successCount++;
        else failedCount++;
      } catch (err: any) {
        await prisma.broadcastLog.create({
          data: {
            broadcastId: broadcast.id,
            contactId: contact.id,
            status: 'FAILED',
            errorMessage: err.message,
          },
        });
        failedCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    // Update broadcast with final counts
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: 'COMPLETED', successCount, failedCount },
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast selesai: ${successCount} berhasil, ${failedCount} gagal`,
      broadcastId: broadcast.id,
      successCount,
      failedCount,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
