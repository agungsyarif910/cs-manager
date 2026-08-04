export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent" | "manager";
  status: "active" | "inactive";
  lastLogin?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  labels: string[];
  tags: string[];
  status: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contact: Contact;
  status: "open" | "resolved" | "escalated";
  agentId?: string;
  handler: "ai" | "human";
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: "text" | "image" | "document" | "template";
  direction: "inbound" | "outbound";
  status: "sent" | "delivered" | "read" | "failed";
  senderType: "customer" | "ai" | "human";
  createdAt: string;
}

export interface AiAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "active" | "inactive";
  systemPrompt?: string;
  greeting?: string;
  closing?: string;
  fallback?: string;
  providerId?: string;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: "pdf" | "txt" | "doc" | "excel" | "csv";
  size: number;
  status: "processing" | "ready" | "failed";
  createdAt: string;
}

export interface Broadcast {
  id: string;
  name: string;
  templateId: string;
  status: "draft" | "scheduled" | "processing" | "completed" | "failed";
  scheduledAt?: string;
  progress: number;
  successCount: number;
  failedCount: number;
  totalTargets: number;
}

export interface WorkflowRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
  isActive: boolean;
}

export interface DashboardStats {
  totalMessages: number;
  messagesToday: number;
  aiMessages: number;
  humanMessages: number;
  avgResponseTime: number;
  successRate: number;
  escalationRate: number;
  activeContacts: number;
}

export interface ChartData {
  date: string;
  value: number;
}
