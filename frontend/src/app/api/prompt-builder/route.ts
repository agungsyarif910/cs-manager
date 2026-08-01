import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser, unauthorized } from '@/lib/auth-helper';

// Save system prompt from Prompt Builder — updates AiProvider + AiAgent without wiping other config
export async function PUT(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const { systemPrompt, sections } = await request.json();
    const companyId = user.companyId;

    if (!systemPrompt) {
      return NextResponse.json({ message: 'systemPrompt is required' }, { status: 400 });
    }

    // Save prompt builder sections as a Setting
    await prisma.setting.upsert({
      where: { companyId_key: { companyId, key: 'prompt_builder' } },
      update: { value: { sections } },
      create: { companyId, key: 'prompt_builder', value: { sections } }
    });

    // Update ONLY systemPrompt in AiProvider (don't touch other fields)
    await prisma.aiProvider.updateMany({
      where: { companyId, isActive: true },
      data: { systemPrompt }
    });

    // Update ONLY systemPrompt in AiAgent (webhook reads this FIRST)
    const agentResult = await prisma.aiAgent.updateMany({
      where: { companyId, isActive: true },
      data: { systemPrompt }
    });

    return NextResponse.json({
      success: true,
      message: `Prompt saved. Updated ${agentResult.count} AI agent(s).`,
      agentsUpdated: agentResult.count
    });
  } catch (e: any) {
    console.error('Prompt Builder save error:', e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// Load prompt builder sections
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return unauthorized();

  try {
    const companyId = user.companyId;

    // Load sections
    const setting = await prisma.setting.findFirst({
      where: { companyId, key: 'prompt_builder' }
    });

    // Also load current systemPrompt from AiAgent (source of truth)
    const aiAgent = await prisma.aiAgent.findFirst({
      where: { companyId, isActive: true },
      select: { systemPrompt: true, name: true }
    });

    return NextResponse.json({
      sections: setting?.value ? (setting.value as any).sections : null,
      currentAgentPrompt: aiAgent?.systemPrompt || '',
      agentName: aiAgent?.name || ''
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
