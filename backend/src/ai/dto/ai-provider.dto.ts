import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AiProviderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  baseUrl!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  topP?: number;
}
