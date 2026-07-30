import { Injectable } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorSearchService } from './vector-search.service';
import { OpenAI } from 'openai';
import { AiProviderService } from '../ai/ai-provider.service';

@Injectable()
export class RagService {
  constructor(
    private embeddingService: EmbeddingService,
    private vectorSearchService: VectorSearchService,
    private aiProviderService: AiProviderService
  ) {}

  async generateAnswer(question: string, aiProviderId: string, companyId: string) {
    // 1. Generate embedding for the question
    const questionEmbedding = await this.embeddingService.generateEmbedding(question, aiProviderId, companyId);

    // 2. Retrieve relevant chunks
    const relevantChunks: any = await this.vectorSearchService.similaritySearch(questionEmbedding, companyId, 5);
    const contextText = relevantChunks.map((c: any) => c.content).join('\n\n');

    // 3. Construct prompt
    const prompt = `You are a helpful assistant. Use the following context to answer the user's question.\n\nContext:\n${contextText}\n\nQuestion: ${question}`;

    // 4. Call AI for the answer
    const provider = await this.aiProviderService.findById(companyId, aiProviderId);
    const client = new OpenAI({
      baseURL: provider.baseUrl,
      apiKey: provider.apiKeyEncrypted,
    });

    const response = await client.chat.completions.create({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  }
}
