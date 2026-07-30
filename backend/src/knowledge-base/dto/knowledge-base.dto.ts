import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SourceType } from '@prisma/client';

export class CreateKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType;
}

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  knowledgeBaseId!: string;
}
