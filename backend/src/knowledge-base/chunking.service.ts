import { Injectable } from '@nestjs/common';

@Injectable()
export class ChunkingService {
  /**
   * Simple recursive character text splitter.
   */
  splitText(text: string, chunkSize: number = 1000, chunkOverlap: number = 200): string[] {
    if (!text) return [];
    
    // In a real scenario, use LangChain's RecursiveCharacterTextSplitter.
    // This is a naive chunker for demonstration.
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.substring(i, i + chunkSize));
      i += chunkSize - chunkOverlap;
    }
    return chunks;
  }
}
