import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get companyId from query param: /api/whatsapp/webhook?companyId=xxx
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) return NextResponse.json({ message: 'companyId required' }, { status: 400 });

    const payload = await request.json();
    console.log('📩 Webhook received for company:', companyId);

    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
    if (!waConfig) return NextResponse.json({ message: 'WhatsApp config not found' }, { status: 404 });

    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });

    // Parse KirimDev webhook format
    let phone = '';
    let messageText = '';
    let contactName = '';

    if (payload.entry?.[0]?.changes?.[0]?.value) {
      const value = payload.entry[0].changes[0].value;
      const msg = value.messages?.[0];
      const contact = value.contacts?.[0];
      phone = msg?.from || contact?.wa_id || '';
      messageText = msg?.text?.body || '';
      contactName = contact?.profile?.name || '';
    } else if (payload.kirim) {
      phone = payload.kirim.contact?.phone_number?.replace('+', '') || '';
      messageText = payload.text?.body || '';
      contactName = payload.kirim.contact?.name || '';
    } else {
      phone = payload.from || '';
      messageText = payload.text?.body || payload.message || '';
      contactName = payload.name || phone;
    }

    if (!phone || !messageText) {
      return NextResponse.json({ status: 'ignored', reason: 'no message content' });
    }

    console.log(`📱 From: ${phone}, Message: ${messageText}`);

    // Find or create contact
    let contact = await prisma.contact.findFirst({ where: { companyId, phone } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { companyId, phone, name: contactName || phone, status: 'ACTIVE' }
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, companyId, status: { in: ['ACTIVE', 'AI_HANDLING'] } }
    });
    if (!conversation) {
      const agent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
      conversation = await prisma.conversation.create({
        data: { contactId: contact.id, companyId, agentId: agent?.id, status: 'AI_HANDLING', handlerType: 'AI', startedAt: new Date() }
      });
    }

    // Save incoming message
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: 'INBOUND', type: 'TEXT', content: messageText, deliveryStatus: 'DELIVERED', isFromAi: false, sentAt: new Date() }
    });

    // Generate AI response
    let aiReply = 'Terima kasih, pesan Anda telah diterima. Tim kami akan segera membantu.';

    if (aiProvider) {
      try {
        const aiAgent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
        const recentMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' }, take: 10
        });
        const messages = [
          { role: 'system', content: aiAgent?.systemPrompt || aiProvider.systemPrompt || 'Kamu adalah AI Customer Service yang ramah dan membantu. Jawab dalam Bahasa Indonesia dengan singkat dan jelas.' },
          ...recentMessages.reverse().map((m: any) => ({
            role: m.direction === 'INBOUND' ? 'user' : 'assistant',
            content: m.content
          }))
        ];

        const aiRes = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiProvider.apiKeyEncrypted}` },
          body: JSON.stringify({ model: aiProvider.model, messages, max_tokens: aiProvider.maxTokens || 500, temperature: aiProvider.temperature || 0.7 })
        });
        const aiData = await aiRes.json() as any;

        if (aiData.choices?.[0]?.message?.content) {
          aiReply = aiData.choices[0].message.content;
        }
      } catch (err: any) {
        console.error('AI Error:', err.message);
      }
    }

    // Save AI response
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: 'OUTBOUND', type: 'TEXT', content: aiReply, deliveryStatus: 'PENDING', isFromAi: true, sentAt: new Date() }
    });

    // Send reply via KirimDev
    try {
      await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waConfig.apiKeyEncrypted}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: aiReply } })
      });
    } catch (err: any) {
      console.error('Send Error:', err.message);
    }

    return NextResponse.json({ status: 'ok', aiReply: aiReply.substring(0, 100) });
  } catch (e: any) {
    console.error('Webhook Error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint active' });
}
