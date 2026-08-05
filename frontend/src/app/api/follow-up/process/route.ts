import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: calculate typing delay
function calculateTypingDelay(text: string): number {
  const calculated = (text.length / 12) * 1000;
  const randomFactor = 0.8 + Math.random() * 0.4;
  return Math.min(Math.max(calculated * randomFactor, 1500), 8000);
}

export async function POST(request: NextRequest) {
  try {
    // Get all companies with follow-up enabled
    const followUpSettings = await prisma.setting.findMany({
      where: { key: 'follow_up_config' },
    });

    let totalSent = 0;
    const results: any[] = [];

    for (const setting of followUpSettings) {
      const companyId = setting.companyId;
      const config = setting.value as any;

      if (!config?.enabled) continue;

      const {
        interval1Hours = 3,
        interval2Hours = 24,
        interval3Hours = 72,
        maxFollowUps = 3,
        workingHourStart = 8,
        workingHourEnd = 20,
        followUpPrompt = 'Kirim pesan follow-up yang ramah.',
      } = config;

      // Check working hours (use Asia/Jakarta timezone)
      const now = new Date();
      const jakartaHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getHours();
      if (jakartaHour < workingHourStart || jakartaHour >= workingHourEnd) {
        results.push({ companyId, status: 'skipped', reason: `Di luar jam kerja (${jakartaHour}:00, range: ${workingHourStart}-${workingHourEnd})` });
        continue;
      }

      // Get intervals array
      const intervals = [interval1Hours, interval2Hours, interval3Hours];

      // Find eligible conversations: AI_HANDLING, last message is OUTBOUND, customer hasn't replied
      const conversations = await prisma.conversation.findMany({
        where: {
          companyId,
          status: 'AI_HANDLING',
          handlerType: 'AI',
        },
        include: {
          contact: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });

      // Get WhatsApp config & AI provider
      const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
      const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });

      if (!waConfig || !aiProvider) {
        results.push({ companyId, status: 'skipped', reason: 'No WA config or AI provider' });
        continue;
      }

      let companySent = 0;

      for (const conv of conversations) {
        if (!conv.messages.length) continue;

        const lastMsg = conv.messages[0]; // Most recent message
        
        // Only follow up if last message is OUTBOUND (we replied, customer didn't respond)
        if (lastMsg.direction !== 'OUTBOUND') continue;

        // Get follow-up metadata
        const metadata = (conv.metadata as any) || {};
        const followUpCount = metadata.followUpCount || 0;

        // Skip if max follow-ups reached
        if (followUpCount >= maxFollowUps) continue;

        // Calculate required idle time based on follow-up count
        const requiredHours = intervals[Math.min(followUpCount, intervals.length - 1)];
        const requiredMs = requiredHours * 60 * 60 * 1000;
        const timeSinceLastMsg = now.getTime() - new Date(lastMsg.createdAt).getTime();

        // Not enough time has passed
        if (timeSinceLastMsg < requiredMs) continue;

        // ─── Generate Follow-Up Message ─────────────────────────────────
        let followUpMessage = 'Halo kak, apakah masih ada yang bisa kami bantu? 😊';

        try {
          const chatHistory = conv.messages.reverse().map((m: any) => ({
            role: m.direction === 'INBOUND' ? 'user' : 'assistant',
            content: m.content || '',
          }));

          const systemPrompt = `${followUpPrompt}

Konteks:
- Ini adalah follow-up ke-${followUpCount + 1}
- Customer terakhir tidak membalas selama ${Math.round(timeSinceLastMsg / 3600000)} jam
- Nama customer: ${conv.contact?.name || 'Customer'}
${followUpCount === 0 ? '- Ini follow-up pertama, cukup tanyakan apakah masih tertarik' : ''}
${followUpCount === 1 ? '- Ini follow-up kedua, tawarkan bantuan atau informasi tambahan' : ''}
${followUpCount >= 2 ? '- Ini follow-up terakhir, sampaikan bahwa kamu tetap available jika butuh bantuan di kemudian hari' : ''}

Aturan:
- Tulis seperti chat WhatsApp biasa (tidak formal)
- Maksimal 2-3 kalimat
- Gunakan 1-2 emoji
- Jangan gunakan markdown
- Jangan menyebut bahwa kamu AI/bot
- Personalisasikan berdasarkan topik percakapan sebelumnya`;

          const aiRes = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiProvider.apiKeyEncrypted}` },
            body: JSON.stringify({
              model: aiProvider.model,
              messages: [
                { role: 'system', content: systemPrompt },
                ...chatHistory,
              ],
              max_tokens: 200,
              temperature: 0.8,
            }),
          });

          const aiData = await aiRes.json() as any;
          if (aiData.choices?.[0]?.message?.content) {
            followUpMessage = aiData.choices[0].message.content;
          }
        } catch (err: any) {
          console.error(`[Follow-Up] AI error for conv ${conv.id}:`, err.message);
        }

        // ─── Send Follow-Up ─────────────────────────────────
        const phone = conv.contact?.phone;
        if (!phone) continue;

        // Typing delay
        const delay = calculateTypingDelay(followUpMessage);
        await sleep(delay);

        // Send via WhatsApp
        try {
          await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waConfig.apiKeyEncrypted}` },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: followUpMessage } }),
          });
        } catch (err: any) {
          console.error(`[Follow-Up] Send error for ${phone}:`, err.message);
          continue;
        }

        // Save message to database
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: 'OUTBOUND',
            type: 'TEXT',
            content: followUpMessage,
            deliveryStatus: 'PENDING',
            isFromAi: true,
            metadata: { isFollowUp: true, followUpNumber: followUpCount + 1 },
            sentAt: new Date(),
          },
        });

        // Update conversation metadata
        const followUpHistory = metadata.followUpHistory || [];
        followUpHistory.push({
          sentAt: new Date().toISOString(),
          message: followUpMessage.slice(0, 100),
          followUpNumber: followUpCount + 1,
        });

        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            metadata: {
              ...metadata,
              followUpCount: followUpCount + 1,
              lastFollowUpAt: new Date().toISOString(),
              followUpHistory,
            },
          },
        });

        companySent++;
        totalSent++;
        console.log(`[Follow-Up] Sent #${followUpCount + 1} to ${conv.contact?.name || phone} (conv: ${conv.id})`);
      }

      results.push({ companyId, status: 'processed', sent: companySent });
    }

    return NextResponse.json({
      success: true,
      totalSent,
      results,
      processedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[Follow-Up] Error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// GET: Check follow-up status
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Follow-up engine ready' });
}
