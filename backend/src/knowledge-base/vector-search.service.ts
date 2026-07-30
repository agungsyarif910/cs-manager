import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VectorSearchService {
  constructor(private prisma: PrismaService) {}

  async similaritySearch(embedding: number[], companyId: string, limit: number = 5) {
    const vectorString = `[${embedding.join(',')}]`;

    // Uses pgvector cosine distance operator <=>
    const results = await this.prisma.$queryRawUnsafe(`
      SELECT dc.id, dc.content, dc."documentId", 1 - (dc.embedding <=> '${vectorString}'::vector) as similarity
      FROM "document_chunks" dc
      JOIN "documents" d ON dc."documentId" = d.id
      WHERE d."companyId" = $1 AND d.status = 'INDEXED'
      ORDER BY dc.embedding <=> '${vectorString}'::vector
      LIMIT $2;
    `, companyId, limit);

    return results;
  }
}
