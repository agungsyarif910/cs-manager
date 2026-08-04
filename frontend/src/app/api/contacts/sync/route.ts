import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// POST: Sync contacts from conversations — update existing, insert missing
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;

    // Get all conversations with their contacts
    const conversations = await prisma.conversation.findMany({
      where: { companyId },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const conv of conversations) {
      if (!conv.contact) {
        skipped++;
        continue;
      }

      const phone = conv.contact.phone;
      if (!phone) { skipped++; continue; }

      // Check if contact exists for this company
      const existing = await prisma.contact.findFirst({
        where: { companyId, phone },
      });

      if (existing) {
        // Update name if the conversation contact has a better name
        const contactName = conv.contact.name;
        if (contactName && contactName !== phone && contactName !== existing.name) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: { name: contactName },
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new contact
        await prisma.contact.create({
          data: {
            companyId,
            phone,
            name: conv.contact.name || phone,
            status: 'ACTIVE',
            labels: [],
            tags: [],
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      totalConversations: conversations.length,
      created,
      updated,
      skipped,
      message: `Sync selesai: ${created} baru ditambahkan, ${updated} diperbarui, ${skipped} sudah sinkron.`,
    });
  } catch (e: any) {
    console.error('Sync error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
