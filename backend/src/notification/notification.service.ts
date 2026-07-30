import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async sendTelegram(botToken: string, chatId: string, message: string) {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
      });
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Telegram message: ${msg}`);
      return false;
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    this.logger.log(`[Email] Sending to ${to} | Subject: ${subject}`);
    // In production, integrate with nodemailer here
    return true;
  }

  async sendWhatsApp(companyId: string, to: string, message: string) {
    this.logger.log(`[WhatsApp] Sending to ${to} for company ${companyId}`);
    // In production, integrate with WhatsAppService here
    return true;
  }

  async getActiveChannels(companyId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { companyId, isActive: true }
    });
    return notifications.map(n => n.channel);
  }
}
