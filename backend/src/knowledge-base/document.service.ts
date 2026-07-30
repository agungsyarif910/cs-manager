import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import * as fs from 'fs';
import pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private prisma: PrismaService,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService,
  ) {}

  async processDocument(documentId: string, aiProviderId: string, companyId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) return;

    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' }
      });

      const fileBuffer = fs.readFileSync(document.filePath);
      let textContent = '';

      // Extractor logic
      if (document.mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        textContent = pdfData.text;
      } else if (document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
        textContent = docxData.value;
      } else {
        textContent = fileBuffer.toString('utf8');
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { content: textContent }
      });

      // Chunk and embed
      const chunks = this.chunkingService.splitText(textContent);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.embeddingService.generateEmbedding(chunk, aiProviderId, companyId);
        const vectorString = `[${embedding.join(',')}]`;

        await this.prisma.$executeRawUnsafe(`
          INSERT INTO "document_chunks" ("id", "documentId", "content", "embedding", "chunkIndex")
          VALUES (gen_random_uuid(), '${documentId}', $1, '${vectorString}'::vector, ${i})
        `, chunk);
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'INDEXED' }
      });

    } catch (error: any) {
      this.logger.error(`Failed to process document ${documentId}: ${error.message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: error.message }
      });
    }
  }
}
