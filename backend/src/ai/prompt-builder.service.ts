import { Injectable } from '@nestjs/common';
import { AiAgent } from '@prisma/client';

@Injectable()
export class PromptBuilderService {
  buildSystemPrompt(agent: AiAgent, context?: string): string {
    let prompt = agent.systemPrompt || 'You are a helpful AI customer service assistant.';
    
    if (agent.role) {
      prompt += `\nYour role: ${agent.role}`;
    }
    
    if (agent.language) {
      prompt += `\nAlways respond in ${agent.language}.`;
    }

    if (agent.tone) {
      prompt += `\nTone: ${agent.tone}`;
    }

    if (context) {
      prompt += `\n\nRelevant Knowledge:\n${context}`;
    }

    return prompt;
  }
}
