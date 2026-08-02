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

  // ─── Human-like Behavior Methods ──────────────────────────────

  /**
   * Mark a message as "read" (centang biru) so the customer
   * sees that their message has been read before we reply.
   */
  async markAsRead(companyId: string, messageId: string) {
    try {
      const { api, phoneNumberId } = await this.getApiInstance(companyId);
      await api.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
      this.logger.log(`Marked message ${messageId} as read`);
    } catch (error) {
      this.logger.warn(`Failed to mark message as read: ${error.message}`);
    }
  }

  /**
   * Send typing indicator ("sedang mengetik...") to the customer.
   * Note: Only supported by some API providers (e.g. kirimdev).
   * Falls back silently if not supported.
   */
  async sendTypingIndicator(companyId: string, to: string, durationMs: number = 3000) {
    try {
      const { api, phoneNumberId } = await this.getApiInstance(companyId);
      // Try to send typing indicator (provider-specific)
      await api.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'typing',
        typing: { action: 'typing', duration: Math.ceil(durationMs / 1000) },
      });
      this.logger.log(`Sent typing indicator to ${to} for ${durationMs}ms`);
    } catch (error) {
      // Typing indicator is not supported by all providers, fail silently
      this.logger.debug(`Typing indicator not supported or failed: ${error.message}`);
    }
  }

  /**
   * Calculate a realistic typing delay based on response length.
   * Simulates ~40-60 words per minute human typing speed.
   * Returns delay in milliseconds.
   */
  calculateTypingDelay(responseText: string, options?: {
    minDelayMs?: number;
    maxDelayMs?: number;
    charsPerSecond?: number;
  }): number {
    const {
      minDelayMs = 1500,
      maxDelayMs = 8000,
      charsPerSecond = 12, // ~40 WPM average
    } = options || {};

    const charCount = responseText.length;
    const calculatedDelay = (charCount / charsPerSecond) * 1000;

    // Add slight randomness (±20%) to feel more natural
    const randomFactor = 0.8 + Math.random() * 0.4;
    const finalDelay = calculatedDelay * randomFactor;

    return Math.min(Math.max(finalDelay, minDelayMs), maxDelayMs);
  }

  /**
   * Send a reply with human-like behavior:
   * 1. Mark incoming message as read (centang biru)
   * 2. Calculate realistic typing delay
   * 3. Send typing indicator
   * 4. Wait for the delay
   * 5. Send the actual message
   */
  async sendHumanizedReply(
    companyId: string,
    to: string,
    replyText: string,
    incomingMessageId?: string,
  ) {
    // Step 1: Mark as read (centang biru)
    if (incomingMessageId) {
      await this.markAsRead(companyId, incomingMessageId);
    }

    // Step 2: Calculate typing delay
    const typingDelay = this.calculateTypingDelay(replyText);
    this.logger.log(`Humanized reply: delay=${typingDelay}ms, length=${replyText.length} chars`);

    // Step 3: Send typing indicator
    await this.sendTypingIndicator(companyId, to, typingDelay);

    // Step 4: Wait for the delay
    await new Promise(resolve => setTimeout(resolve, typingDelay));

    // Step 5: Send the actual message
    return this.sendText(companyId, to, replyText);
  }

  // ─── Core Messaging Methods ───────────────────────────────────

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

