import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiProviderService } from './ai-provider.service';
import { AiAgentService } from './ai-agent.service';
import { PromptBuilderService } from './prompt-builder.service';

@Module({
  providers: [AiService, AiProviderService, AiAgentService, PromptBuilderService],
  exports: [AiService, AiProviderService, AiAgentService],
})
export class AiModule {}
