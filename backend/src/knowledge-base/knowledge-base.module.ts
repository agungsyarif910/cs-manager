import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { DocumentService } from './document.service';
import { ExcelService } from './excel.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { VectorSearchService } from './vector-search.service';
import { RagService } from './rag.service';
import { AiModule } from '../ai/ai.module';
// Stubs for remaining controllers/services requested
import { DocumentController } from './document.controller';
import { ExcelController } from './excel.controller';
import { DatabaseConnectorController } from './database-connector.controller';
import { DatabaseConnectorService } from './database-connector.service';

@Module({
  imports: [AiModule],
  controllers: [
    KnowledgeBaseController, 
    DocumentController, 
    ExcelController,
    DatabaseConnectorController
  ],
  providers: [
    KnowledgeBaseService,
    DocumentService,
    ExcelService,
    ChunkingService,
    EmbeddingService,
    VectorSearchService,
    RagService,
    DatabaseConnectorService
  ],
  exports: [KnowledgeBaseService, RagService],
})
export class KnowledgeBaseModule {}
