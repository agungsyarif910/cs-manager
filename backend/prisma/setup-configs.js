const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create WhatsApp Config
  const config = await prisma.whatsAppConfig.upsert({
    where: { id: 'wa-config-1' },
    update: {},
    create: {
      id: 'wa-config-1',
      name: 'Main WhatsApp',
      apiBaseUrl: 'https://api.kirimdev.com/v1',
      apiKeyEncrypted: 'test-api-key',
      webhookSecret: 'test-secret',
      phoneNumberId: 'test-phone-id',
      phoneNumber: '628123456789',
      isActive: true,
      companyId: 'e95919cc-7679-464e-8bd2-a9b3811e937c'
    }
  });
  console.log('WhatsApp Config:', JSON.stringify(config, null, 2));

  // Create AI Provider if not exists
  const provider = await prisma.aiProvider.upsert({
    where: { id: 'ai-provider-1' },
    update: {},
    create: {
      id: 'ai-provider-1',
      name: 'SumoPod',
      baseUrl: 'https://ai.sumopod.com/v1',
      apiKeyEncrypted: 'test-key',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'Kamu adalah AI Customer Service yang ramah dan membantu.',
      isActive: true,
      companyId: 'e95919cc-7679-464e-8bd2-a9b3811e937c'
    }
  });
  console.log('AI Provider:', JSON.stringify(provider, null, 2));

  // Create AI Agent
  const agent = await prisma.aiAgent.upsert({
    where: { id: 'ai-agent-1' },
    update: {},
    create: {
      id: 'ai-agent-1',
      name: 'CS Umum',
      description: 'AI Agent untuk customer service umum',
      systemPrompt: 'Kamu adalah AI Customer Service bernama Aira dari perusahaan kami. Jawab pertanyaan pelanggan dengan ramah, profesional, dan dalam Bahasa Indonesia.',
      greeting: 'Halo! Selamat datang. Saya Aira, AI CS yang siap membantu Anda. Ada yang bisa saya bantu?',
      fallbackMessage: 'Mohon maaf, saya perlu mengecek dengan tim kami. Mohon tunggu sebentar ya.',
      language: 'id',
      tone: 'friendly',
      maxConversation: 50,
      isActive: true,
      companyId: 'e95919cc-7679-464e-8bd2-a9b3811e937c',
      aiProviderId: 'ai-provider-1'
    }
  });
  console.log('AI Agent:', JSON.stringify(agent, null, 2));

  console.log('\n✅ All configs created successfully!');
}

main().catch(console.error).finally(() => prisma['$disconnect']());
