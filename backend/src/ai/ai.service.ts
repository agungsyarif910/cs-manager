import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { AiAgentService } from './ai-agent.service';
import { PromptBuilderService } from './prompt-builder.service';
import { AiProviderService } from './ai-provider.service';
import { Conversation, Message } from '@prisma/client';

@Injectable()
export class AiService {
  constructor(
    private aiAgentService: AiAgentService,
    private aiProviderService: AiProviderService,
    private promptBuilder: PromptBuilderService,
  ) {}

  async getEmbedding(text: string, aiProviderId: string, companyId: string): Promise<number[]> {
    const provider = await this.aiProviderService.findById(companyId, aiProviderId);
    
    const client = new OpenAI({
      baseURL: provider.baseUrl,
      apiKey: provider.apiKeyEncrypted,
    });

    const response = await client.embeddings.create({
      input: text,
      model: provider.model, // or a specific embedding model
    });

    return response.data[0].embedding;
  }

  async processMessage(conversation: Conversation, newMessage: Message, companyId: string) {
    if (!conversation.agentId) return null;
    
    const agent = await this.aiAgentService.findById(companyId, conversation.agentId);
    const provider = agent.aiProvider;

    const client = new OpenAI({
      baseURL: provider.baseUrl,
      apiKey: provider.apiKeyEncrypted, // In real scenario, decrypt this
    });

    const systemPrompt = this.promptBuilder.buildSystemPrompt(agent);

    const completion = await client.chat.completions.create({
      model: provider.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: newMessage.content || '' }
      ],
      temperature: provider.temperature,
      max_tokens: provider.maxTokens,
    });

    return {
      content: completion.choices[0].message.content,
      confidence: 0.9 // mockup confidence score
    };
  }
}
