import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class AiAgentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsString()
  @IsNotEmpty()
  aiProviderId!: string;
}
