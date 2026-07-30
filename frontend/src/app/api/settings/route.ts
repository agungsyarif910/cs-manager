import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // If specific key requested
    if (key) {
      const setting = await prisma.setting.findFirst({ where: { companyId, key } });
      return NextResponse.json(setting || { key, value: {} });
    }

    // Get all settings
    const settings = await prisma.setting.findMany({ where: { companyId } });
    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });

    const result = [...settings];
    if (waConfig && !result.find((s: any) => s.key === 'whatsapp_config')) {
      result.push({
        id: 'wa-derived', companyId, key: 'whatsapp_config',
        value: { apiUrl: waConfig.apiBaseUrl, apiKey: waConfig.apiKeyEncrypted, phoneNumberId: waConfig.phoneNumberId, phoneNumber: waConfig.phoneNumber, webhookSecret: waConfig.webhookSecret },
        createdAt: new Date(), updatedAt: new Date()
      } as any);
    }
    if (aiProvider && !result.find((s: any) => s.key === 'ai_config')) {
      result.push({
        id: 'ai-derived', companyId, key: 'ai_config',
        value: { apiUrl: aiProvider.baseUrl, apiKey: aiProvider.apiKeyEncrypted, model: aiProvider.model, temperature: String(aiProvider.temperature), maxTokens: String(aiProvider.maxTokens) },
        createdAt: new Date(), updatedAt: new Date()
      } as any);
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ message: 'key is required' }, { status: 400 });

    const { value } = await request.json();
    const companyId = user.companyId;

    const result = await prisma.setting.upsert({
      where: { companyId_key: { companyId, key } },
      update: { value },
      create: { companyId, key, value }
    });

    if (key === 'whatsapp_config' && value) {
      await prisma.whatsAppConfig.upsert({
        where: { id: 'wa-config-1' },
        update: { apiBaseUrl: value.apiUrl || '', apiKeyEncrypted: value.apiKey || '', phoneNumberId: value.phoneNumberId || '', phoneNumber: value.phoneNumber || '', webhookSecret: value.webhookSecret || '', isActive: true },
        create: { id: 'wa-config-1', name: 'Main WhatsApp', apiBaseUrl: value.apiUrl || '', apiKeyEncrypted: value.apiKey || '', phoneNumberId: value.phoneNumberId || '', phoneNumber: value.phoneNumber || '', webhookSecret: value.webhookSecret || '', isActive: true, companyId }
      });
    }
    if (key === 'ai_config' && value) {
      await prisma.aiProvider.upsert({
        where: { id: 'ai-provider-1' },
        update: { baseUrl: value.apiUrl || '', apiKeyEncrypted: value.apiKey || '', model: value.model || '', temperature: parseFloat(value.temperature) || 0.7, maxTokens: parseInt(value.maxTokens) || 2048, topP: parseFloat(value.topP) || 0.9, systemPrompt: value.systemPrompt || '', isActive: true },
        create: { id: 'ai-provider-1', name: 'SumoPod', baseUrl: value.apiUrl || '', apiKeyEncrypted: value.apiKey || '', model: value.model || '', temperature: parseFloat(value.temperature) || 0.7, maxTokens: parseInt(value.maxTokens) || 2048, topP: parseFloat(value.topP) || 0.9, systemPrompt: value.systemPrompt || '', isActive: true, companyId }
      });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
