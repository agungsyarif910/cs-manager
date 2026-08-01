import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
  const user = getUser(request);
  if (!user) return unauthorized();
  try {
    const setting = await prisma.setting.findFirst({ where: { companyId: user.companyId, key: params.key } });
    return NextResponse.json(setting || { key: params.key, value: {} });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { key: string } }) {
  const user = getUser(request);
  if (!user) return unauthorized();
  try {
    const { key } = params;
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
      // Also sync systemPrompt to active AiAgent (webhook reads AiAgent first)
      if (value.systemPrompt) {
        await prisma.aiAgent.updateMany({
          where: { companyId, isActive: true },
          data: { systemPrompt: value.systemPrompt }
        });
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
