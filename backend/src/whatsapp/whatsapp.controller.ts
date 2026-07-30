import { Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentCompany } from '../common/decorators/company.decorator';
import { WhatsAppConfigService } from './whatsapp-config.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly configService: WhatsAppConfigService
  ) {}

  @Post('webhook/:companyId')
  async webhook(
    @Param('companyId') companyId: string,
    @Headers('X-Kirim-Signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: any
  ) {
    const config = await this.configService.findActive(companyId);
    
    // Convert body to string for signature verification (simplified)
    const rawBody = JSON.stringify(payload); 
    
    if (!this.whatsappService.verifyWebhookSignature(signature, rawBody, config.webhookSecret)) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.whatsappService.processIncomingMessage(payload, companyId);
    return { status: 'ok' };
  }

  @Post('send/text')
  async sendText(@Body() dto: SendMessageDto, @CurrentCompany() companyId: string) {
    return this.whatsappService.sendText(companyId, dto.to, dto.text!);
  }

  @Post('send/image')
  async sendImage(@Body() dto: SendMessageDto, @CurrentCompany() companyId: string) {
    return this.whatsappService.sendImage(companyId, dto.to, dto.imageUrl!, dto.caption);
  }

  @Post('send/document')
  async sendDocument(@Body() dto: SendMessageDto, @CurrentCompany() companyId: string) {
    return this.whatsappService.sendDocument(companyId, dto.to, dto.documentUrl!, dto.filename, dto.caption);
  }

  @Post('send/location')
  async sendLocation(@Body() dto: SendMessageDto, @CurrentCompany() companyId: string) {
    return this.whatsappService.sendLocation(companyId, dto.to, dto.latitude!, dto.longitude!, dto.name, dto.address);
  }

  @Get('message/:id/status')
  async getMessageStatus(@Param('id') id: string, @CurrentCompany() companyId: string) {
    return this.whatsappService.getMessageStatus(companyId, id);
  }
}
