import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    const payload = await request.json();

    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
    if (!waConfig) return NextResponse.json({ message: 'WhatsApp config not found' }, { status: 404 });

    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });
    const phone = payload.from || payload.contacts?.[0]?.wa_id;
    const messageText = payload.text?.body || payload.messages?.[0]?.text?.body || '';
    if (!phone || !messageText) return NextResponse.json({ status: 'ignored' });

    let contact = await prisma.contact.findFirst({ where: { companyId, phone } });
    if (!contact) {
      contact = await prisma.contact.create({ data: { companyId, phone, name: payload.contacts?.[0]?.profile?.name || phone, status: 'ACTIVE' } });
    }

    let conversation = await prisma.conversation.findFirst({ where: { contactId: contact.id, companyId, status: { in: ['ACTIVE', 'AI_HANDLING'] } } });
    if (!conversation) {
      const agent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
      conversation = await prisma.conversation.create({ data: { contactId: contact.id, companyId, agentId: agent?.id, status: 'AI_HANDLING', handlerType: 'AI', startedAt: new Date() } });
    }

    await prisma.message.create({ data: { conversationId: conversation.id, direction: 'INBOUND', type: 'TEXT', content: messageText, deliveryStatus: 'DELIVERED', isFromAi: false, sentAt: new Date() } });

    let aiReply = 'Terima kasih, pesan Anda telah diterima.';
    if (aiProvider) {
      try {
        const aiAgent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
        const recentMessages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' }, take: 10 });
        const messages = [
          { role: 'system', content: aiAgent?.systemPrompt || 'Kamu AI Customer Service yang ramah. Jawab dalam Bahasa Indonesia.' },
          ...recentMessages.reverse().map((m: any) => ({ role: m.direction === 'INBOUND' ? 'user' : 'assistant', content: m.content }))
        ];

        const aiRes = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiProvider.apiKeyEncrypted}` },
          body: JSON.stringify({ model: aiProvider.model, messages, max_tokens: aiProvider.maxTokens || 500, temperature: aiProvider.temperature || 0.7 })
        });
        const aiData = await aiRes.json() as any;
        if (aiData.choices?.[0]?.message?.content) aiReply = aiData.choices[0].message.content;
      } catch (err: any) { console.error('AI Error:', err.message); }
    }

    await prisma.message.create({ data: { conversationId: conversation.id, direction: 'OUTBOUND', type: 'TEXT', content: aiReply, deliveryStatus: 'PENDING', isFromAi: true, sentAt: new Date() } });

    try {
      await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waConfig.apiKeyEncrypted}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: aiReply } })
      });
    } catch (err: any) { console.error('Send Error:', err.message); }

    return NextResponse.json({ status: 'ok', aiReply: aiReply.substring(0, 100) });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
