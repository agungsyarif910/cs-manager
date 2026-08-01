import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) return NextResponse.json({ message: 'companyId required' }, { status: 400 });

    const payload = await request.json();

    // ========== ANTI-SPAM PROTECTION ==========

    // 1. Ignore status updates (only process actual messages)
    const changes = payload.entry?.[0]?.changes?.[0];
    if (changes?.value?.statuses) {
      return NextResponse.json({ status: 'ignored', reason: 'status update' });
    }

    // Parse message
    let phone = '';
    let messageText = '';
    let contactName = '';
    let externalMessageId = '';

    if (payload.entry?.[0]?.changes?.[0]?.value) {
      const value = payload.entry[0].changes[0].value;
      const msg = value.messages?.[0];
      const contact = value.contacts?.[0];
      
      // Only process text messages
      if (!msg || msg.type !== 'text') {
        return NextResponse.json({ status: 'ignored', reason: 'not a text message' });
      }

      phone = msg.from || contact?.wa_id || '';
      messageText = msg.text?.body || '';
      contactName = contact?.profile?.name || '';
      externalMessageId = msg.id || '';
    } else if (payload.kirim) {
      phone = payload.kirim.contact?.phone_number?.replace('+', '') || '';
      messageText = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
      contactName = payload.kirim.contact?.name || '';
      externalMessageId = payload.kirim.message_id || '';
    } else {
      return NextResponse.json({ status: 'ignored', reason: 'unknown format' });
    }

    if (!phone || !messageText) {
      return NextResponse.json({ status: 'ignored', reason: 'no message content' });
    }

    // 2. Deduplicate: Check if this message ID was already processed
    if (externalMessageId) {
      const existing = await prisma.message.findFirst({
        where: { externalId: externalMessageId }
      });
      if (existing) {
        return NextResponse.json({ status: 'ignored', reason: 'duplicate message' });
      }
    }

    // 3. Cooldown: Don't reply if we already replied to this contact in last 10 seconds
    const contact = await prisma.contact.findFirst({ where: { companyId, phone } });
    if (contact) {
      const recentReply = await prisma.message.findFirst({
        where: {
          conversation: { contactId: contact.id, companyId },
          direction: 'OUTBOUND',
          createdAt: { gte: new Date(Date.now() - 10000) } // 10 seconds
        },
        orderBy: { createdAt: 'desc' }
      });
      if (recentReply) {
        return NextResponse.json({ status: 'ignored', reason: 'cooldown active' });
      }
    }

    // ========== PROCESS MESSAGE ==========

    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
    if (!waConfig) return NextResponse.json({ message: 'WhatsApp config not found' }, { status: 404 });

    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });

    // Find or create contact
    let dbContact = contact;
    if (!dbContact) {
      dbContact = await prisma.contact.create({
        data: { companyId, phone, name: contactName || phone, status: 'ACTIVE' }
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { contactId: dbContact.id, companyId, status: { in: ['ACTIVE', 'AI_HANDLING'] } }
    });
    if (!conversation) {
      const agent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
      conversation = await prisma.conversation.create({
        data: { contactId: dbContact.id, companyId, agentId: agent?.id, status: 'AI_HANDLING', handlerType: 'AI', startedAt: new Date() }
      });
    }

    // Save incoming message (with externalId for dedup)
    await prisma.message.create({
      data: {
        conversationId: conversation.id, direction: 'INBOUND', type: 'TEXT',
        content: messageText, deliveryStatus: 'DELIVERED', isFromAi: false,
        externalId: externalMessageId || null, sentAt: new Date()
      }
    });

    // ========== SKIP AI IF HUMAN_HANDLING ==========
    if (conversation.status === 'HUMAN_HANDLING' || conversation.handlerType === 'HUMAN') {
      return NextResponse.json({ status: 'ok', reason: 'human_handling', message: 'Message saved, AI skipped (human handling)' });
    }

    // ========== AI RESPONSE (only 1 reply per message) ==========

    let aiReply = 'Terima kasih, pesan Anda telah diterima. Tim kami akan segera membantu.';

    if (aiProvider) {
      try {
        const aiAgent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });

        // RAG: Search knowledge base
        let knowledgeContext = '';
        try {
          const keywords = messageText.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          if (keywords.length > 0) {
            const chunks = await prisma.documentChunk.findMany({
              where: {
                document: { companyId },
                OR: keywords.map((kw: string) => ({ content: { contains: kw, mode: 'insensitive' as any } }))
              },
              take: 5, orderBy: { chunkIndex: 'asc' }
            });
            if (chunks.length > 0) {
              knowledgeContext = '\n\n=== KNOWLEDGE BASE ===\n' +
                chunks.map((c: any) => c.content).join('\n---\n') + '\n=== END ===';
            }
          }
        } catch (kbErr: any) { console.error('KB error:', kbErr.message); }

        const systemPrompt = (aiAgent?.systemPrompt || aiProvider.systemPrompt ||
          'Kamu adalah AI CS yang ramah. Jawab singkat dalam Bahasa Indonesia.') + knowledgeContext;

        const recentMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' }, take: 10
        });

        const aiRes = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiProvider.apiKeyEncrypted}` },
          body: JSON.stringify({
            model: aiProvider.model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...recentMessages.reverse().map((m: any) => ({
                role: m.direction === 'INBOUND' ? 'user' : 'assistant', content: m.content
              }))
            ],
            max_tokens: aiProvider.maxTokens || 500,
            temperature: aiProvider.temperature || 0.7
          })
        });
        const aiData = await aiRes.json() as any;
        if (aiData.choices?.[0]?.message?.content) {
          aiReply = aiData.choices[0].message.content;
        }
      } catch (err: any) { console.error('AI Error:', err.message); }
    }

    // Save AI reply
    await prisma.message.create({
      data: {
        conversationId: conversation.id, direction: 'OUTBOUND', type: 'TEXT',
        content: aiReply, deliveryStatus: 'PENDING', isFromAi: true, sentAt: new Date()
      }
    });

    // Send via KirimDev (1 message only)
    try {
      await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waConfig.apiKeyEncrypted}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: aiReply } })
      });
    } catch (err: any) { console.error('Send Error:', err.message); }

    return NextResponse.json({ status: 'ok' });
  } catch (e: any) {
    console.error('Webhook Error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook active' });
}
