import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;
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
