import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// GET: List all documents
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const documents = await prisma.document.findMany({
      where: { companyId: user.companyId },
      orderBy: { uploadedAt: 'desc' },
      include: { knowledgeBase: true }
    });

    return NextResponse.json(documents.map(d => ({
      id: d.id,
      name: d.originalName,
      type: d.mimeType?.split('/').pop() || 'unknown',
      size: d.fileSize,
      status: d.status,
      content: d.content?.substring(0, 200),
      createdAt: d.uploadedAt,
      knowledgeBase: d.knowledgeBase?.name
    })));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Upload and parse document
export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });

    const companyId = user.companyId;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const mimeType = file.type;

    // Parse document content based on type
    let textContent = '';

    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
      // Use unpdf (works in serverless/edge)
      const { extractText } = await import('unpdf');
      const { text } = await extractText(new Uint8Array(buffer));
      textContent = Array.isArray(text) ? text.join('\n') : String(text);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const allText: string[] = [];
      workbook.SheetNames.forEach((sheetName: string) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        allText.push(`=== Sheet: ${sheetName} ===`);
        jsonData.forEach((row: any[]) => {
          allText.push(row.filter(Boolean).join(' | '));
        });
      });
      textContent = allText.join('\n');
    } else if (mimeType === 'text/plain' || filename.endsWith('.txt') || filename.endsWith('.md')) {
      textContent = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ message: `Unsupported file type: ${mimeType}` }, { status: 400 });
    }

    if (!textContent.trim()) {
      return NextResponse.json({ message: 'Could not extract text from file' }, { status: 400 });
    }

    // Get or create default knowledge base
    let kb = await prisma.knowledgeBase.findFirst({ where: { companyId } });
    if (!kb) {
      kb = await prisma.knowledgeBase.create({
        data: { name: 'Default Knowledge Base', description: 'Auto-created', sourceType: 'DOCUMENT', companyId, config: {} }
      });
    }

    // Split into chunks (max 1000 chars each)
    const chunks = splitIntoChunks(textContent, 1000);

    // Save document
    const doc = await prisma.document.create({
      data: {
        knowledgeBaseId: kb.id,
        filename: filename,
        originalName: filename,
        mimeType: mimeType,
        fileSize: buffer.length,
        filePath: '',
        version: 1,
        status: 'INDEXED',
        content: textContent,
        companyId: companyId,
      }
    });

    // Save chunks
    for (let i = 0; i < chunks.length; i++) {
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          content: chunks[i],
          chunkIndex: i,
          tokenCount: Math.ceil(chunks[i].length / 4),
          metadata: { source: filename, chunk: i + 1, total: chunks.length }
        }
      });
    }

    return NextResponse.json({
      id: doc.id,
      name: filename,
      size: buffer.length,
      chunks: chunks.length,
      contentPreview: textContent.substring(0, 300),
      status: 'INDEXED'
    });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// DELETE: Remove document
export async function DELETE(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');
    if (!docId) return NextResponse.json({ message: 'id required' }, { status: 400 });

    // Delete chunks first
    await prisma.documentChunk.deleteMany({ where: { documentId: docId } });
    // Delete document
    await prisma.document.delete({ where: { id: docId } });

    return NextResponse.json({ status: 'deleted' });
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
