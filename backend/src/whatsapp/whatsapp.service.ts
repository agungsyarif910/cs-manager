import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { WhatsAppConfigService } from './whatsapp-config.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private configService: WhatsAppConfigService) {}

  private async getApiInstance(companyId: string) {
    const config = await this.configService.findActive(companyId);
    return {
      api: axios.create({
        baseURL: config.apiBaseUrl,
        headers: { Authorization: `Bearer ${config.apiKeyEncrypted}` },
      }),
      phoneNumberId: config.phoneNumberId,
      secret: config.webhookSecret,
    };
  }

  async sendText(companyId: string, to: string, text: string) {
    const { api, phoneNumberId } = await this.getApiInstance(companyId);
    return api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }).then(r => r.data);
  }

  async sendImage(companyId: string, to: string, imageUrl: string, caption?: string) {
    const { api, phoneNumberId } = await this.getApiInstance(companyId);
    return api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, caption },
    }).then(r => r.data);
  }

  async sendDocument(companyId: string, to: string, documentUrl: string, filename?: string, caption?: string) {
    const { api, phoneNumberId } = await this.getApiInstance(companyId);
    return api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { link: documentUrl, filename, caption },
    }).then(r => r.data);
  }

  async sendLocation(companyId: string, to: string, latitude: number, longitude: number, name?: string, address?: string) {
    const { api, phoneNumberId } = await this.getApiInstance(companyId);
    return api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'location',
      location: { latitude, longitude, name, address },
    }).then(r => r.data);
  }

  async getMessageStatus(companyId: string, messageId: string) {
    const { api, phoneNumberId } = await this.getApiInstance(companyId);
    return api.get(`/${phoneNumberId}/messages/${messageId}`).then(r => r.data);
  }

  verifyWebhookSignature(signature: string, payload: string, secret: string): boolean {
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return signature === expectedSignature;
  }

  async processIncomingMessage(payload: any, companyId: string) {
    this.logger.log(`Processing incoming message for company ${companyId}`);
    // Logic for processing goes here, routing to AI/workflow
    return true;
  }
}
