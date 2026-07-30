import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings (merged from all tables)' })
  async getAll(@Request() req: any) {
    const companyId = req.user.companyId;
    
    // Get generic settings
    const genericSettings = await this.settingsService.getAll(companyId);
    
    // Get WhatsApp config from dedicated table
    const waConfig = await this.prisma.whatsAppConfig.findFirst({
      where: { companyId, isActive: true }
    });
    
    // Get AI Provider from dedicated table
    const aiProvider = await this.prisma.aiProvider.findFirst({
      where: { companyId, isActive: true }
    });
    
    // Get AI Agent
    const aiAgent = await this.prisma.aiAgent.findFirst({
      where: { companyId, isActive: true }
    });

    // Build settings array
    const result = [...genericSettings];
    
    // Add WhatsApp config if exists
    if (waConfig) {
      const exists = result.find(s => s.key === 'whatsapp_config');
      if (!exists) {
        result.push({
          id: 'wa-derived',
          companyId,
          key: 'whatsapp_config',
          value: {
            apiUrl: waConfig.apiBaseUrl,
            apiKey: waConfig.apiKeyEncrypted,
            phoneNumberId: waConfig.phoneNumberId,
            phoneNumber: waConfig.phoneNumber,
            webhookSecret: waConfig.webhookSecret,
            webhookUrl: '',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Add AI config if exists
    if (aiProvider) {
      const exists = result.find(s => s.key === 'ai_config');
      if (!exists) {
        result.push({
          id: 'ai-derived',
          companyId,
          key: 'ai_config',
          value: {
            apiUrl: aiProvider.baseUrl,
            apiKey: aiProvider.apiKeyEncrypted,
            model: aiProvider.model,
            temperature: String(aiProvider.temperature),
            maxTokens: String(aiProvider.maxTokens),
            topP: String(aiProvider.topP),
            systemPrompt: aiProvider.systemPrompt || '',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    
    return result;
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific setting' })
  async get(@Request() req: any, @Param('key') key: string) {
    return this.settingsService.get(req.user.companyId, key);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Create or update a setting (also syncs to dedicated tables)' })
  async set(
    @Request() req: any, 
    @Param('key') key: string, 
    @Body() data: { value: any }
  ) {
    const companyId = req.user.companyId;
    
    // Save to generic settings table
    const result = await this.settingsService.set(companyId, key, data.value);
    
    // Sync to dedicated tables
    if (key === 'whatsapp_config' && data.value) {
      const v = data.value;
      await this.prisma.whatsAppConfig.upsert({
        where: { id: 'wa-config-1' },
        update: {
          apiBaseUrl: v.apiUrl || 'https://api.kirimdev.com/v1',
          apiKeyEncrypted: v.apiKey || '',
          phoneNumberId: v.phoneNumberId || '',
          phoneNumber: v.phoneNumber || '',
          webhookSecret: v.webhookSecret || '',
          isActive: true,
        },
        create: {
          id: 'wa-config-1',
          name: 'Main WhatsApp',
          apiBaseUrl: v.apiUrl || 'https://api.kirimdev.com/v1',
          apiKeyEncrypted: v.apiKey || '',
          phoneNumberId: v.phoneNumberId || '',
          phoneNumber: v.phoneNumber || '',
          webhookSecret: v.webhookSecret || '',
          isActive: true,
          companyId,
        }
      });
    }
    
    if (key === 'ai_config' && data.value) {
      const v = data.value;
      await this.prisma.aiProvider.upsert({
        where: { id: 'ai-provider-1' },
        update: {
          baseUrl: v.apiUrl || 'https://ai.sumopod.com/v1',
          apiKeyEncrypted: v.apiKey || '',
          model: v.model || 'deepseek-chat',
          temperature: parseFloat(v.temperature) || 0.7,
          maxTokens: parseInt(v.maxTokens) || 2048,
          topP: parseFloat(v.topP) || 0.9,
          systemPrompt: v.systemPrompt || '',
          isActive: true,
        },
        create: {
          id: 'ai-provider-1',
          name: 'SumoPod',
          baseUrl: v.apiUrl || 'https://ai.sumopod.com/v1',
          apiKeyEncrypted: v.apiKey || '',
          model: v.model || 'deepseek-chat',
          temperature: parseFloat(v.temperature) || 0.7,
          maxTokens: parseInt(v.maxTokens) || 2048,
          topP: parseFloat(v.topP) || 0.9,
          systemPrompt: v.systemPrompt || '',
          isActive: true,
          companyId,
        }
      });
    }

    return result;
  }
}
