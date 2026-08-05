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
      // Still process follow-ups for other conversations
      processFollowUps(companyId).catch(err => console.error('[Follow-Up] Background error:', err));
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

    // ========== PROCESS PENDING FOLLOW-UPS ==========
    processFollowUps(companyId).catch(err => console.error('[Follow-Up] Background error:', err));

    return NextResponse.json({ status: 'ok' });
  } catch (e: any) {
    console.error('Webhook Error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// FOLLOW-UP ENGINE — runs inline on every webhook call
// ═══════════════════════════════════════════════════════════════

async function processFollowUps(companyId: string) {
  try {
    // Load follow-up config
    const setting = await prisma.setting.findFirst({
      where: { companyId, key: 'follow_up_config' },
    });
    if (!setting) return;

    const config = setting.value as any;
    if (!config?.enabled) return;

    const {
      interval1Hours = 3,
      interval2Hours = 24,
      interval3Hours = 72,
      maxFollowUps = 3,
      workingHourStart = 8,
      workingHourEnd = 20,
      followUpPrompt = 'Kirim pesan follow-up yang ramah.',
    } = config;

    // Check working hours (Asia/Jakarta)
    const now = new Date();
    const jakartaHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getHours();
    if (jakartaHour < workingHourStart || jakartaHour >= workingHourEnd) return;

    const intervals = [interval1Hours, interval2Hours, interval3Hours];

    // Find eligible conversations
    const conversations = await prisma.conversation.findMany({
      where: { companyId, status: 'AI_HANDLING', handlerType: 'AI' },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });
    if (!waConfig || !aiProvider) return;

    for (const conv of conversations) {
      if (!conv.messages.length) continue;

      const lastMsg = conv.messages[0];
      // Only follow up if last message is OUTBOUND (AI replied, customer silent)
      if (lastMsg.direction !== 'OUTBOUND') continue;

      const metadata = (conv.metadata as any) || {};
      const followUpCount = metadata.followUpCount || 0;
      if (followUpCount >= maxFollowUps) continue;

      const requiredHours = intervals[Math.min(followUpCount, intervals.length - 1)];
      const timeSinceLastMsg = now.getTime() - new Date(lastMsg.createdAt).getTime();
      if (timeSinceLastMsg < requiredHours * 3600000) continue;

      // Generate follow-up message via AI
      let followUpMessage = 'Halo kak, apakah masih ada yang bisa kami bantu? 😊';
      try {
        const chatHistory = conv.messages.reverse().map((m: any) => ({
          role: m.direction === 'INBOUND' ? 'user' : 'assistant',
          content: m.content || '',
        }));

        const systemPrompt = `${followUpPrompt}

Konteks:
- Ini follow-up ke-${followUpCount + 1}
- Customer tidak membalas selama ${Math.round(timeSinceLastMsg / 3600000)} jam
- Nama customer: ${conv.contact?.name || 'Customer'}
${followUpCount === 0 ? '- Follow-up pertama, tanyakan apakah masih tertarik' : ''}
${followUpCount === 1 ? '- Follow-up kedua, tawarkan bantuan tambahan' : ''}
${followUpCount >= 2 ? '- Follow-up terakhir, sampaikan tetap available jika butuh bantuan' : ''}

Aturan:
- Tulis seperti chat WhatsApp biasa
- Maksimal 2-3 kalimat, 1-2 emoji
- Jangan gunakan markdown
- Jangan menyebut bahwa kamu AI/bot
- Personalisasikan berdasarkan percakapan sebelumnya`;

        const aiRes = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiProvider.apiKeyEncrypted}` },
          body: JSON.stringify({
            model: aiProvider.model,
            messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
            max_tokens: 200,
            temperature: 0.8,
          }),
        });
        const aiData = await aiRes.json() as any;
        if (aiData.choices?.[0]?.message?.content) {
          followUpMessage = aiData.choices[0].message.content;
        }
      } catch (err: any) {
        console.error(`[Follow-Up] AI error conv ${conv.id}:`, err.message);
      }

      const phone = conv.contact?.phone;
      if (!phone) continue;

      // Human-like delay
      await sleep(calculateTypingDelay(followUpMessage));

      // Send via WhatsApp
      try {
        await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waConfig.apiKeyEncrypted}` },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: followUpMessage } }),
        });
      } catch (err: any) {
        console.error(`[Follow-Up] Send error ${phone}:`, err.message);
        continue;
      }

      // Save message
      await prisma.message.create({
        data: {
          conversationId: conv.id, direction: 'OUTBOUND', type: 'TEXT',
          content: followUpMessage, deliveryStatus: 'PENDING', isFromAi: true,
          metadata: { isFollowUp: true, followUpNumber: followUpCount + 1 },
          sentAt: new Date(),
        },
      });

      // Update metadata
      const history = metadata.followUpHistory || [];
      history.push({ sentAt: new Date().toISOString(), message: followUpMessage.slice(0, 100), number: followUpCount + 1 });

      await prisma.conversation.update({
        where: { id: conv.id },
        data: {
          metadata: { ...metadata, followUpCount: followUpCount + 1, lastFollowUpAt: new Date().toISOString(), followUpHistory: history },
        },
      });

      console.log(`[Follow-Up] Sent #${followUpCount + 1} to ${conv.contact?.name || phone}`);
    }
  } catch (err: any) {
    console.error('[Follow-Up] Engine error:', err.message);
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook active' });
}

