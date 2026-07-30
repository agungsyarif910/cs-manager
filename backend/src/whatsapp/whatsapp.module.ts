import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { WhatsAppGateway } from './whatsapp.gateway';

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppConfigService, WhatsAppGateway],
  exports: [WhatsAppService, WhatsAppGateway],
})
export class WhatsAppModule {}
