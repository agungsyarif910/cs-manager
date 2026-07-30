import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { AiProviderService } from '../ai/ai-provider.service';

@Injectable()
export class EmbeddingService {
  constructor(private aiProviderService: AiProviderService) {}

  async generateEmbedding(text: string, aiProviderId: string, companyId: string): Promise<number[]> {
    const provider = await this.aiProviderService.findById(companyId, aiProviderId);
    
    const client = new OpenAI({
      baseURL: provider.baseUrl,
      apiKey: provider.apiKeyEncrypted,
    });

    const response = await client.embeddings.create({
      input: text,
      model: 'text-embedding-ada-002', // fallback model
    });

    return response.data[0].embedding;
  }
}
