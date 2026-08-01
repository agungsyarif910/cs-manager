import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// POST: Save pre-parsed text content (parsed client-side)
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { filename, mimeType, fileSize, textContent } = await request.json();

    if (!textContent?.trim()) {
      return NextResponse.json({ message: 'No text content' }, { status: 400 });
    }

    const companyId = user.companyId;

    // Get or create default knowledge base
    let kb = await prisma.knowledgeBase.findFirst({ where: { companyId } });
    if (!kb) {
      kb = await prisma.knowledgeBase.create({
        data: { name: 'Default Knowledge Base', description: 'Auto-created', sourceType: 'DOCUMENT', companyId, config: {} }
      });
    }

    // Split into chunks
    const chunks = splitIntoChunks(textContent, 1000);

    // Save document
    const doc = await prisma.document.create({
      data: {
        knowledgeBaseId: kb.id,
        filename, originalName: filename,
        mimeType: mimeType || 'text/plain',
        fileSize: fileSize || textContent.length,
        filePath: '', version: 1, status: 'INDEXED',
        content: textContent, companyId,
      }
    });

    // Save chunks
    for (let i = 0; i < chunks.length; i++) {
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id, content: chunks[i],
          chunkIndex: i, tokenCount: Math.ceil(chunks[i].length / 4),
          metadata: { source: filename, chunk: i + 1, total: chunks.length }
        }
      });
    }

    return NextResponse.json({ id: doc.id, name: filename, chunks: chunks.length, status: 'INDEXED' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

function splitIntoChunks(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxSize && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.substring(0, maxSize)];
}
