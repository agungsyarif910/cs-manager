import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// POST: Send manual reply (human) or takeover/release
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { conversationId, action, message } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ message: 'conversationId wajib diisi' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      return NextResponse.json({ message: 'Conversation tidak ditemukan' }, { status: 404 });
    }

    // ===== TAKEOVER: Switch to HUMAN mode =====
    if (action === 'takeover') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'HUMAN_HANDLING', handlerType: 'HUMAN', assignedUserId: user.sub },
      });
      return NextResponse.json({ success: true, message: 'Takeover berhasil, mode Human aktif' });
    }

    // ===== RELEASE: Switch back to AI mode =====
    if (action === 'release') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'AI_HANDLING', handlerType: 'AI', assignedUserId: null },
      });
      return NextResponse.json({ success: true, message: 'Release berhasil, mode AI aktif' });
    }

    // ===== SEND MESSAGE =====
    if (action === 'send') {
      if (!message || !message.trim()) {
        return NextResponse.json({ message: 'Pesan tidak boleh kosong' }, { status: 400 });
      }

      if (conversation.handlerType !== 'HUMAN') {
        return NextResponse.json({ message: 'Hanya bisa kirim pesan saat mode Human' }, { status: 400 });
      }

      // Get WhatsApp config
      const settings = await prisma.settings.findMany({
        where: {
          companyId: user.companyId,
          key: { in: ['wa_api_base_url', 'wa_phone_number_id', 'wa_api_key'] }
        }
      });

      const waConfig: any = {};
      settings.forEach((s: any) => {
        if (s.key === 'wa_api_base_url') waConfig.apiBaseUrl = s.value;
        if (s.key === 'wa_phone_number_id') waConfig.phoneNumberId = s.value;
        if (s.key === 'wa_api_key') waConfig.apiKey = s.value;
      });

      if (!waConfig.apiBaseUrl || !waConfig.phoneNumberId || !waConfig.apiKey) {
        return NextResponse.json({ message: 'Konfigurasi WhatsApp belum lengkap' }, { status: 400 });
      }

      // Save message to DB
      const newMsg = await prisma.message.create({
        data: {
          conversationId,
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: message.trim(),
          deliveryStatus: 'PENDING',
          isFromAi: false,
          sentAt: new Date(),
        }
      });

      // Send via KirimDev
      const phone = conversation.contact?.phone;
      try {
        const sendUrl = `${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`;
        const sendRes = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${waConfig.apiKey}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message.trim() },
          }),
        });

        if (sendRes.ok) {
          await prisma.message.update({
            where: { id: newMsg.id },
            data: { deliveryStatus: 'SENT' },
          });
        }
      } catch (err: any) {
        console.error('Send error:', err.message);
      }

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Pesan terkirim',
        data: {
          id: newMsg.id,
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: message.trim(),
          isFromAi: false,
          deliveryStatus: 'SENT',
          createdAt: newMsg.createdAt,
        }
      });
    }

    return NextResponse.json({ message: 'Action tidak valid (takeover/release/send)' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
