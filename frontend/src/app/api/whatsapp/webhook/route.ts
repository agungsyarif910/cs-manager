import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── Human-like Behavior Helpers ─────────────────────────────

/** Calculate realistic typing delay based on response length */
function calculateTypingDelay(text: string): number {
  const charsPerSecond = 12; // ~40 WPM
  const minDelay = 1500;
  const maxDelay = 8000;
  const calculated = (text.length / charsPerSecond) * 1000;
  const randomFactor = 0.8 + Math.random() * 0.4;
  return Math.min(Math.max(calculated * randomFactor, minDelay), maxDelay);
}

/** Sleep utility */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Build human-like system prompt */
function buildHumanLikePrompt(basePrompt: string, agent?: any): string {
  let prompt = basePrompt;

  if (agent?.role) prompt += `\nYour role: ${agent.role}`;
  if (agent?.language) prompt += `\nAlways respond in ${agent.language}.`;
  if (agent?.tone) prompt += `\nTone: ${agent.tone}`;

  prompt += `

## Aturan Perilaku Chat (WAJIB diikuti):

### Gaya Menulis:
- Tulis pesan seperti manusia biasa di WhatsApp, BUKAN seperti robot/AI
- Gunakan huruf kecil di awal kalimat sesekali (seperti chat biasa)
- Jangan terlalu formal, gunakan bahasa sehari-hari yang sopan
- Boleh gunakan singkatan wajar (yg, utk, dgn, dll) jika sesuai tone
- Gunakan emoji secukupnya, jangan berlebihan (1-2 per pesan)
- Jangan gunakan format markdown (**, ##, dll) — ini WhatsApp, bukan dokumen

### Panjang Pesan:
- Jawab singkat dan to the point (1-3 kalimat untuk pertanyaan sederhana)
- Untuk penjelasan panjang, pecah jadi beberapa paragraf pendek
- Jangan membuat daftar panjang kecuali diminta

### Perilaku Natural:
- Jangan selalu memulai dengan "Tentu!" atau "Baik!" — variasikan pembukaan
- Jangan selalu mengakhiri dengan "Ada yang bisa dibantu lagi?" — gunakan sesekali saja
- Jika tidak tahu jawabannya, bilang jujur dan tawarkan alternatif
- Sesekali gunakan kata-kata empati: "oh gitu", "wah", "hmm", "oke"
- Jangan ulangi pertanyaan user kembali, langsung jawab

### Yang TIDAK boleh dilakukan:
- Jangan menyebut bahwa kamu adalah AI/bot/asisten virtual
- Jangan gunakan frasa template yang kaku
- Jangan berikan disclaimer panjang
- Jangan gunakan bullet points berlebihan`;

  return prompt;
}

/** Send mark-as-read status */
async function markAsRead(waConfig: any, messageId: string) {
  try {
    await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waConfig.apiKeyEncrypted}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId })
    });
  } catch (e) { /* silent fail */ }
}

/** Send typing indicator (provider-specific, may not be supported) */
async function sendTypingIndicator(waConfig: any, to: string, durationSec: number) {
  try {
    await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waConfig.apiKeyEncrypted}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp', recipient_type: 'individual', to,
        type: 'typing', typing: { action: 'typing', duration: durationSec }
      })
    });
  } catch (e) { /* typing indicator not supported by all providers, fail silently */ }
}

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

    // Check global handler mode setting
    const handlerSetting = await prisma.setting.findFirst({ where: { companyId, key: 'handler_mode' } });
    const globalMode = (handlerSetting?.value as any)?.mode || 'AI';

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { contactId: dbContact.id, companyId, status: { in: ['ACTIVE', 'AI_HANDLING', 'HUMAN_HANDLING'] } }
    });

    if (!conversation) {
      // Create new conversation with current global mode
      const agent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
      const newStatus = globalMode === 'HUMAN' ? 'HUMAN_HANDLING' : 'AI_HANDLING';
      const newHandler = globalMode === 'HUMAN' ? 'HUMAN' : 'AI';
      conversation = await prisma.conversation.create({
        data: { contactId: dbContact.id, companyId, agentId: agent?.id, status: newStatus, handlerType: newHandler, startedAt: new Date() }
      });
    } else {
      // ========== FIX: Sync existing conversation with global mode ==========
      // If global mode changed to AI but conversation is stuck in HUMAN (and no specific agent assigned),
      // auto-switch it back to AI mode
      if (globalMode === 'AI' && conversation.handlerType === 'HUMAN' && !conversation.assignedUserId) {
        const agent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: 'AI_HANDLING', handlerType: 'AI', agentId: agent?.id || conversation.agentId }
        });
        console.log(`[Webhook] Auto-switched conversation ${conversation.id} to AI mode (global mode: AI)`);
      }
      // If global mode changed to HUMAN but conversation is in AI mode
      if (globalMode === 'HUMAN' && conversation.handlerType === 'AI') {
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: 'HUMAN_HANDLING', handlerType: 'HUMAN' }
        });
        console.log(`[Webhook] Auto-switched conversation ${conversation.id} to HUMAN mode (global mode: HUMAN)`);
      }
    }

    // Save incoming message (with externalId for dedup)
    await prisma.message.create({
      data: {
        conversationId: conversation.id, direction: 'INBOUND', type: 'TEXT',
        content: messageText, deliveryStatus: 'DELIVERED', isFromAi: false,
        externalId: externalMessageId || null, sentAt: new Date()
      }
    });

    // Reset follow-up counter when customer replies
    const convMeta = (conversation.metadata as any) || {};
    if (convMeta.followUpCount && convMeta.followUpCount > 0) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { metadata: { ...convMeta, followUpCount: 0, lastFollowUpAt: null } }
      });
      console.log(`[Webhook] Reset follow-up counter for conv ${conversation.id}`);
    }

    // ========== SKIP AI IF HUMAN_HANDLING ==========
    // Only skip if conversation is explicitly assigned to a human agent OR global mode is HUMAN
    if (conversation.status === 'HUMAN_HANDLING' || conversation.handlerType === 'HUMAN') {
      return NextResponse.json({ status: 'ok', reason: 'human_handling', message: 'Message saved, AI skipped (human handling)' });
    }

    // ========== HUMAN-LIKE: Mark as Read ==========
    if (externalMessageId) {
      await markAsRead(waConfig, externalMessageId);
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

        // Build human-like system prompt
        const basePrompt = aiAgent?.systemPrompt || aiProvider.systemPrompt ||
          'Kamu adalah AI CS yang ramah. Jawab singkat dalam Bahasa Indonesia.';
        const systemPrompt = buildHumanLikePrompt(basePrompt, aiAgent) + knowledgeContext;

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

    // ========== HUMAN-LIKE: Typing Delay ==========
    const typingDelay = calculateTypingDelay(aiReply);
    await sendTypingIndicator(waConfig, phone, Math.ceil(typingDelay / 1000));
    await sleep(typingDelay);

    // Save AI reply
    await prisma.message.create({
      data: {
        conversationId: conversation.id, direction: 'OUTBOUND', type: 'TEXT',
        content: aiReply, deliveryStatus: 'PENDING', isFromAi: true, sentAt: new Date()
      }
    });

    // Send via WhatsApp API
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
