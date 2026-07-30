import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

const express = require('express');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'cs-manager-jwt-secret-2026-production';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ==================== AUTH ====================
app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Email atau password salah' });
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Email atau password salah' });
    
    const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    
    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId }
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: any, res: any) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId });
});

// ==================== AUTH MIDDLEWARE ====================
function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token expired atau invalid' });
  }
}

// ==================== SETTINGS ====================
app.get('/api/settings', authMiddleware, async (req: any, res: any) => {
  try {
    const companyId = req.user.companyId;
    const settings = await prisma.setting.findMany({ where: { companyId } });
    
    // Merge from WhatsAppConfig and AiProvider
    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });
    
    const result = [...settings];
    
    if (waConfig && !result.find(s => s.key === 'whatsapp_config')) {
      result.push({
        id: 'wa-derived', companyId, key: 'whatsapp_config',
        value: { apiUrl: waConfig.apiBaseUrl, apiKey: waConfig.apiKeyEncrypted, phoneNumberId: waConfig.phoneNumberId, phoneNumber: waConfig.phoneNumber, webhookSecret: waConfig.webhookSecret },
        createdAt: new Date(), updatedAt: new Date()
      } as any);
    }
    if (aiProvider && !result.find(s => s.key === 'ai_config')) {
      result.push({
        id: 'ai-derived', companyId, key: 'ai_config',
        value: { apiUrl: aiProvider.baseUrl, apiKey: aiProvider.apiKeyEncrypted, model: aiProvider.model, temperature: String(aiProvider.temperature), maxTokens: String(aiProvider.maxTokens) },
        createdAt: new Date(), updatedAt: new Date()
      } as any);
    }
    
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/settings/:key', authMiddleware, async (req: any, res: any) => {
  try {
    const setting = await prisma.setting.findFirst({ where: { companyId: req.user.companyId, key: req.params.key } });
    res.json(setting || { key: req.params.key, value: {} });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/api/settings/:key', authMiddleware, async (req: any, res: any) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const companyId = req.user.companyId;
    
    const result = await prisma.setting.upsert({
      where: { companyId_key: { companyId, key } },
      update: { value },
      create: { companyId, key, value }
    });
    
    // Sync to dedicated tables
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
    
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ==================== DASHBOARD ====================
app.get('/api/dashboard/stats', authMiddleware, async (req: any, res: any) => {
  try {
    const companyId = req.user.companyId;
    const today = new Date(); today.setHours(0,0,0,0);
    
    const [totalMessages, todayMessages, totalContacts, activeConversations, aiMessages, humanMessages] = await Promise.all([
      prisma.message.count({ where: { conversation: { companyId } } }),
      prisma.message.count({ where: { conversation: { companyId }, createdAt: { gte: today } } }),
      prisma.contact.count({ where: { companyId } }),
      prisma.conversation.count({ where: { companyId, status: { in: ['ACTIVE', 'AI_HANDLING', 'HUMAN_HANDLING'] } } }),
      prisma.message.count({ where: { conversation: { companyId }, isFromAi: true } }),
      prisma.message.count({ where: { conversation: { companyId }, isFromAi: false, direction: 'OUTBOUND' } }),
    ]);
    
    res.json({ totalMessages, todayMessages, totalContacts, activeConversations, aiMessages, humanMessages, aiSuccessRate: totalMessages > 0 ? Math.round((aiMessages / Math.max(totalMessages, 1)) * 100) : 0 });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ==================== CONTACTS ====================
app.get('/api/contacts', authMiddleware, async (req: any, res: any) => {
  try {
    const contacts = await prisma.contact.findMany({ where: { companyId: req.user.companyId }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(contacts);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== CONVERSATIONS ====================
app.get('/api/conversations', authMiddleware, async (req: any, res: any) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { companyId: req.user.companyId },
      include: { contact: true, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }, take: 50
    });
    res.json(conversations);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.get('/api/conversations/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { contact: true, messages: { orderBy: { createdAt: 'asc' } }, assignedUser: true }
    });
    res.json(conv);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== USERS ====================
app.get('/api/users', authMiddleware, async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({ where: { companyId: req.user.companyId }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } });
    res.json(users);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== TEMPLATES ====================
app.get('/api/templates', authMiddleware, async (req: any, res: any) => {
  try {
    const templates = await prisma.template.findMany({ where: { companyId: req.user.companyId }, orderBy: { createdAt: 'desc' } });
    res.json(templates);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== KNOWLEDGE BASE ====================
app.get('/api/knowledge-base', authMiddleware, async (req: any, res: any) => {
  try {
    const kbs = await prisma.knowledgeBase.findMany({ where: { companyId: req.user.companyId }, include: { documents: true } });
    res.json(kbs);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== AI AGENTS ====================
app.get('/api/ai-agents', authMiddleware, async (req: any, res: any) => {
  try {
    const agents = await prisma.aiAgent.findMany({ where: { companyId: req.user.companyId } });
    res.json(agents);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== WORKFLOWS ====================
app.get('/api/workflows', authMiddleware, async (req: any, res: any) => {
  try {
    const workflows = await prisma.workflow.findMany({ where: { companyId: req.user.companyId } });
    res.json(workflows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== BROADCASTS ====================
app.get('/api/broadcasts', authMiddleware, async (req: any, res: any) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({ where: { companyId: req.user.companyId }, orderBy: { createdAt: 'desc' } });
    res.json(broadcasts);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== AUDIT LOGS ====================
app.get('/api/audit-logs', authMiddleware, async (req: any, res: any) => {
  try {
    const logs = await prisma.auditLog.findMany({ where: { companyId: req.user.companyId }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(logs);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ==================== WHATSAPP WEBHOOK ====================
app.post('/api/whatsapp/webhook/:companyId', async (req: any, res: any) => {
  try {
    const { companyId } = req.params;
    const payload = req.body;
    
    // Get WhatsApp config
    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { companyId, isActive: true } });
    if (!waConfig) return res.status(404).json({ message: 'WhatsApp config not found' });
    
    // Get AI provider config
    const aiProvider = await prisma.aiProvider.findFirst({ where: { companyId, isActive: true } });
    
    // Parse incoming message
    const phone = payload.from || payload.contacts?.[0]?.wa_id;
    const messageText = payload.text?.body || payload.messages?.[0]?.text?.body || '';
    const messageType = payload.type || payload.messages?.[0]?.type || 'text';
    
    if (!phone || !messageText) return res.json({ status: 'ignored', reason: 'no message content' });
    
    // Find or create contact
    let contact = await prisma.contact.findFirst({ where: { companyId, phone } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { companyId, phone, name: payload.contacts?.[0]?.profile?.name || phone, status: 'ACTIVE' }
      });
    }
    
    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, companyId, status: { in: ['ACTIVE', 'AI_HANDLING'] } }
    });
    if (!conversation) {
      const agent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
      conversation = await prisma.conversation.create({
        data: { contactId: contact.id, companyId, agentId: agent?.id, status: 'AI_HANDLING', handlerType: 'AI', startedAt: new Date() }
      });
    }
    
    // Save incoming message
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: 'INBOUND', type: messageType.toUpperCase() as any, content: messageText, deliveryStatus: 'DELIVERED', isFromAi: false, sentAt: new Date() }
    });
    
    // Generate AI response
    let aiReply = 'Terima kasih, pesan Anda telah diterima. Tim kami akan segera membantu.';
    
    if (aiProvider) {
      try {
        const aiAgent = await prisma.aiAgent.findFirst({ where: { companyId, isActive: true } });
        const systemPrompt = aiAgent?.systemPrompt || 'Kamu adalah AI Customer Service yang ramah dan membantu. Jawab dalam Bahasa Indonesia.';
        
        // Get recent conversation history
        const recentMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' }, take: 10
        });
        
        const messages = [
          { role: 'system', content: systemPrompt },
          ...recentMessages.reverse().map((m: any) => ({
            role: m.direction === 'INBOUND' ? 'user' : 'assistant',
            content: m.content
          }))
        ];
        
        const fetch = (await import('node-fetch')).default;
        const aiRes = await fetch(`${aiProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiProvider.apiKeyEncrypted}` },
          body: JSON.stringify({ model: aiProvider.model, messages, max_tokens: aiProvider.maxTokens || 500, temperature: aiProvider.temperature || 0.7 })
        });
        
        const aiData = await aiRes.json() as any;
        if (aiData.choices?.[0]?.message?.content) {
          aiReply = aiData.choices[0].message.content;
        }
      } catch (aiErr: any) {
        console.error('AI Error:', aiErr.message);
      }
    }
    
    // Save AI response
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: 'OUTBOUND', type: 'TEXT', content: aiReply, deliveryStatus: 'PENDING', isFromAi: true, sentAt: new Date() }
    });
    
    // Send reply via KirimDev
    if (waConfig) {
      try {
        const fetch = (await import('node-fetch')).default;
        await fetch(`${waConfig.apiBaseUrl}/${waConfig.phoneNumberId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${waConfig.apiKeyEncrypted}` },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: aiReply } })
        });
      } catch (sendErr: any) {
        console.error('Send Error:', sendErr.message);
      }
    }
    
    res.json({ status: 'ok', aiReply: aiReply.substring(0, 100) + '...' });
  } catch (e: any) {
    console.error('Webhook Error:', e);
    res.status(500).json({ message: e.message });
  }
});

// ==================== HEALTH ====================
app.get('/api', (_req: any, res: any) => {
  res.json({ status: 'ok', service: 'AI CS Manager API', timestamp: new Date().toISOString() });
});

module.exports = app;
