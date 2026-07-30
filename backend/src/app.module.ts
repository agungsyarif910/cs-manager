import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { ConversationModule } from './conversation/conversation.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ContactsModule } from './contacts/contacts.module';
import { TemplatesModule } from './templates/templates.module';
import { WorkflowModule } from './workflow/workflow.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { NotificationModule } from './notification/notification.module';
import { BackupModule } from './backup/backup.module';
import { SettingsModule } from './settings/settings.module';
import { AutoReplyModule } from './auto-reply/auto-reply.module';
import { AppConfigModule } from './config/config.module';

// Conditionally import Bull/Queue modules only when Redis is available
const REDIS_ENABLED = process.env.REDIS_HOST && process.env.REDIS_HOST !== '';

const conditionalImports = [];

if (REDIS_ENABLED) {
  // These will be loaded dynamically when Redis is configured
  try {
    const { BullModule } = require('@nestjs/bull');
    const { QueueModule } = require('./queue/queue.module');
    const { BroadcastModule } = require('./broadcast/broadcast.module');
    
    conditionalImports.push(
      BullModule.forRoot({
        redis: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      }),
      QueueModule,
      BroadcastModule,
    );
  } catch (e) {
    console.warn('⚠️ Redis/BullMQ modules not available, queues disabled');
  }
}

@Module({
  imports: [
    AppConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      ttl: 60000,
      limit: 100,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    WhatsAppModule,
    AiModule,
    ConversationModule,
    KnowledgeBaseModule,
    ContactsModule,
    TemplatesModule,
    WorkflowModule,
    DashboardModule,
    AuditModule,
    NotificationModule,
    BackupModule,
    SettingsModule,
    AutoReplyModule,
    ...conditionalImports,
  ],
})
export class AppModule {}
