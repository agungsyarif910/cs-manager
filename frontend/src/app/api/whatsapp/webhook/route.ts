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
- Jangan gunakan bullet points berlebihan

### Pendaftaran/Registrasi:
- Jika customer ingin MENDAFTAR/DAFTAR ke suatu program/kelas, kumpulkan data berikut:
  1. Nama lengkap
  2. Nomor HP yang aktif
  3. Program atau kelas yang ingin diikuti
- Setelah SEMUA data lengkap (nama, HP, program), WAJIB tambahkan tag berikut di AKHIR pesan kamu (SETELAH pesan normal):
  [REGISTRATION:{"name":"Nama Lengkap","phone":"08xxxx","program":"Nama Program"}]
- Tag ini TIDAK akan terlihat oleh customer, jadi tulis pesan konfirmasi seperti biasa LALU tambahkan tag di baris terakhir
- Jangan minta data yang sudah diberikan sebelumnya di chat
- HANYA output tag [REGISTRATION:...] SATU KALI saat data pertama kali lengkap
- Setelah registrasi dicatat, JANGAN kirim info pembayaran di pesanmu karena sistem akan mengirim detail pembayaran secara OTOMATIS dalam pesan terpisah
- Cukup konfirmasi bahwa pendaftaran sudah dicatat dan info pembayaran akan segera menyusul`;

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

    // ========== DETECT REGISTRATION FROM AI REPLY ==========
    let registrationData: any = null;
    const regMatch = aiReply.match(/\[REGISTRATION:\s*(\{[\s\S]*?\})\]/);
    if (regMatch) {
      try {
        const regData = JSON.parse(regMatch[1]);
        if (regData.name && regData.phone && regData.program) {
          // Load registration settings for deadline
          const regSettings = await prisma.setting.findFirst({ where: { companyId, key: 'registration_config' } });
          const deadlineHours = (regSettings?.value as any)?.deadlineHours || 24;

          const deadline = new Date();
          deadline.setHours(deadline.getHours() + deadlineHours);

          const newReg = await prisma.registration.create({
            data: {
              companyId,
              contactId: dbContact.id,
              conversationId: conversation.id,
              name: regData.name,
              phone: regData.phone,
              program: regData.program,
              status: 'PENDING',
              paymentDeadline: deadline,
            },
          });
          registrationData = {
            id: newReg.id,
            name: regData.name,
            phone: regData.phone,
            program: regData.program,
            deadline,
          };
          console.log(`[Registration] Saved: ${regData.name} - ${regData.program}`);
        }
      } catch (err: any) {
        console.error('[Registration] Parse error:', err.message);
      }
      // Strip tag from message
      aiReply = aiReply.replace(/\[REGISTRATION:\s*\{[\s\S]*?\}\]/, '').trim();
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

    // ========== SEND PAYMENT NOTIFICATION AFTER REGISTRATION ==========
    if (registrationData) {
      try {
        // Natural delay before sending payment info
        await sleep(3000);

        // Search knowledge base for payment/program info
        let paymentContext = '';
        try {
          const programKeywords = registrationData.program.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          const paymentKeywords = [...programKeywords, 'bayar', 'pembayaran', 'harga', 'biaya', 'transfer', 'rekening', 'bank'];

          const chunks = await prisma.documentChunk.findMany({
            where: {
              document: { companyId },
              OR: paymentKeywords.map((kw: string) => ({
                content: { contains: kw, mode: 'insensitive' as any }
              }))
            },
            take: 8,
            orderBy: { chunkIndex: 'asc' }
          });

          if (chunks.length > 0) {
            paymentContext = chunks.map((c: any) => c.content).join('\n---\n');
          }
        } catch (kbErr: any) {
          console.error('[Payment] KB search error:', kbErr.message);
        }

        // Format deadline in Indonesian
        const deadlineFormatted = registrationData.deadline.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Generate payment notification via AI
        let paymentMessage = `Berikut info pembayaran untuk program ${registrationData.program}:\n\n⏰ Batas pembayaran: ${deadlineFormatted} WIB\n\nSilakan hubungi admin untuk info lebih lanjut mengenai pembayaran. Terima kasih! 🙏`;

        if (aiProvider) {
          try {
            const paymentPrompt = `Kamu adalah CS yang mengirimkan info pembayaran ke customer yang baru mendaftar program.

Data Registrasi:
- Nama: ${registrationData.name}
- Program: ${registrationData.program}
- Batas Pembayaran: ${deadlineFormatted} WIB (maksimal 1 hari dari sekarang)

${paymentContext ? `Info dari Knowledge Base tentang program/pembayaran:\n${paymentContext}` : 'Tidak ada info pembayaran spesifik di knowledge base.'}

TUGAS:
- Buat pesan WhatsApp berisi info pembayaran untuk program yang didaftarkan
- Sebutkan: nama program, biaya (jika ada di knowledge base), cara pembayaran/transfer (jika ada di knowledge base), dan batas waktu pembayaran
- Jika info biaya/rekening ada di knowledge base, WAJIB sertakan secara lengkap dan akurat
- Jika tidak ada info biaya di knowledge base, sampaikan bahwa detail pembayaran akan diinfokan oleh admin
- Batas pembayaran: ${deadlineFormatted} WIB
- Tulis seperti chat WhatsApp biasa, ramah, gunakan 1-2 emoji
- Jangan gunakan format markdown (**, ##, dll)
- Jangan menyebut diri sebagai AI/bot
- Akhiri dengan ajakan untuk mengirim bukti transfer setelah pembayaran`;

            const paymentAiRes = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${aiProvider.apiKeyEncrypted}`
              },
              body: JSON.stringify({
                model: aiProvider.model,
                messages: [{ role: 'system', content: paymentPrompt }],
                max_tokens: 500,
                temperature: 0.6
              })
            });

            const paymentAiData = await paymentAiRes.json() as any;
            if (paymentAiData.choices?.[0]?.message?.content) {
              paymentMessage = paymentAiData.choices[0].message.content;
            }
          } catch (aiErr: any) {
            console.error('[Payment] AI generation error:', aiErr.message);
          }
        }

        // Human-like typing delay
        const paymentTypingDelay = calculateTypingDelay(paymentMessage);
        await sendTypingIndicator(waConfig, phone, Math.ceil(paymentTypingDelay / 1000));
        await sleep(paymentTypingDelay);

        // Save payment notification message
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: paymentMessage,
            deliveryStatus: 'PENDING',
            isFromAi: true,
            metadata: { isPaymentNotification: true, registrationId: registrationData.id, registrationProgram: registrationData.program },
            sentAt: new Date()
          }
        });

        // Send payment info via WhatsApp
        await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${waConfig.apiKeyEncrypted}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: paymentMessage }
          })
        });

        // Update registration status to WAITING_PAYMENT
        await prisma.registration.update({
          where: { id: registrationData.id },
          data: { status: 'WAITING_PAYMENT' }
        });

        console.log(`[Payment] Sent payment info to ${registrationData.name} for program: ${registrationData.program}`);
      } catch (payErr: any) {
        console.error('[Payment] Notification error:', payErr.message);
      }
    }

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ status: 'ok', message: 'Webhook active. Add ?companyId=xxx to run diagnostics.' });
  }

  // ========== DIAGNOSTIC MODE ==========
  try {
    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId } });
    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId } });
    const aiAgent = await prisma.aiAgent.findFirst({ where: { companyId } });
    const handlerSetting = await prisma.setting.findFirst({ where: { companyId, key: 'handler_mode' } });
    const globalMode = (handlerSetting?.value as any)?.mode || 'AI';

    // Check recent conversations
    const recentConversations = await prisma.conversation.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { contact: { select: { phone: true, name: true } } }
    });

    // Check recent messages
    const recentMessages = await prisma.message.findMany({
      where: { conversation: { companyId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, direction: true, content: true, isFromAi: true, createdAt: true, deliveryStatus: true }
    });

    const issues: string[] = [];

    // Check WhatsApp Config
    if (!waConfig) {
      issues.push('❌ WhatsAppConfig TIDAK DITEMUKAN untuk companyId ini');
    } else if (!waConfig.isActive) {
      issues.push('❌ WhatsAppConfig TIDAK AKTIF (isActive = false) — aktifkan di dashboard Settings > WhatsApp');
    }

    // Check AI Provider
    if (!aiProvider) {
      issues.push('⚠️ AiProvider TIDAK DITEMUKAN — AI akan pakai fallback message saja');
    } else if (!aiProvider.isActive) {
      issues.push('⚠️ AiProvider TIDAK AKTIF (isActive = false) — AI tidak akan generate jawaban cerdas');
    }

    // Check AI Agent
    if (!aiAgent) {
      issues.push('⚠️ AiAgent TIDAK DITEMUKAN — akan pakai default prompt');
    } else if (!aiAgent.isActive) {
      issues.push('⚠️ AiAgent TIDAK AKTIF (isActive = false)');
    }

    // Check handler mode
    if (globalMode === 'HUMAN') {
      issues.push('❌ Handler Mode = HUMAN — AI TIDAK akan membalas pesan! Ubah ke AI di dashboard Settings');
    }

    // Check stuck conversations
    const humanConvs = recentConversations.filter(c => c.handlerType === 'HUMAN' || c.status === 'HUMAN_HANDLING');
    if (humanConvs.length > 0) {
      issues.push(`⚠️ ${humanConvs.length} percakapan terakhir dalam mode HUMAN_HANDLING — AI tidak membalas percakapan ini`);
    }

    // Check assigned conversations
    const assignedConvs = recentConversations.filter(c => c.assignedUserId);
    if (assignedConvs.length > 0 && globalMode === 'AI') {
      issues.push(`⚠️ ${assignedConvs.length} percakapan masih di-assign ke user — tidak akan auto-switch ke AI meskipun mode global = AI`);
    }

    const diagnostic = {
      status: issues.length === 0 ? '✅ ALL OK' : `⚠️ ${issues.length} ISSUE(S) FOUND`,
      issues,
      config: {
        whatsapp: waConfig ? {
          id: waConfig.id,
          name: waConfig.name,
          isActive: waConfig.isActive,
          apiBaseUrl: waConfig.apiBaseUrl,
          phoneNumber: waConfig.phoneNumber,
          phoneNumberId: waConfig.phoneNumberId,
          hasApiKey: !!waConfig.apiKeyEncrypted,
          hasWebhookSecret: !!waConfig.webhookSecret,
        } : null,
        aiProvider: aiProvider ? {
          id: aiProvider.id,
          name: aiProvider.name,
          isActive: aiProvider.isActive,
          baseUrl: aiProvider.baseUrl,
          model: aiProvider.model,
          hasApiKey: !!aiProvider.apiKeyEncrypted,
        } : null,
        aiAgent: aiAgent ? {
          id: aiAgent.id,
          name: aiAgent.name,
          isActive: aiAgent.isActive,
          hasSystemPrompt: !!aiAgent.systemPrompt,
          language: aiAgent.language,
        } : null,
        globalHandlerMode: globalMode,
      },
      recentConversations: recentConversations.map(c => ({
        id: c.id,
        contact: c.contact?.name || c.contact?.phone,
        status: c.status,
        handlerType: c.handlerType,
        assignedUserId: c.assignedUserId,
        createdAt: c.createdAt,
      })),
      recentMessages: recentMessages.map(m => ({
        id: m.id,
        direction: m.direction,
        content: (m.content || '').slice(0, 80) + ((m.content || '').length > 80 ? '...' : ''),
        isFromAi: m.isFromAi,
        deliveryStatus: m.deliveryStatus,
        createdAt: m.createdAt,
      })),
    };

    return NextResponse.json(diagnostic, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

