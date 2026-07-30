import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Conversation, Message } from "@/types";

export function useConversations(filters: any) {
  return useQuery({
    queryKey: ["conversations", filters],
    queryFn: async (): Promise<Conversation[]> => {
      // const { data } = await api.get("/conversations", { params: filters });
      // return data.data;
      
      return [
        {
          id: "1",
          contactId: "c1",
          contact: { id: "c1", name: "John Doe", phone: "+1234567890", labels: [], tags: [], status: "active", createdAt: "2026-01-01" },
          status: "open",
          handler: "ai",
          lastMessage: "I need help with my order.",
          lastMessageAt: new Date().toISOString(),
          unreadCount: 1,
        }
      ];
    }
  });
}

export function useConversationDetail(id: string) {
  return useQuery({
    queryKey: ["conversation", id],
    queryFn: async (): Promise<Conversation> => {
      const { data } = await api.get(`/conversations/${id}`);
      return data;
    },
    enabled: !!id
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<Message[]> => {
      // Mock 
      return [
        { id: "m1", conversationId, content: "Hello", type: "text", direction: "inbound", status: "read", senderType: "customer", createdAt: new Date(Date.now() - 60000).toISOString() },
        { id: "m2", conversationId, content: "How can I help?", type: "text", direction: "outbound", status: "delivered", senderType: "ai", createdAt: new Date().toISOString() }
      ];
    },
    enabled: !!conversationId
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // await api.post(`/conversations/${conversationId}/messages`, { content });
      return { id: "new", content, direction: "outbound", senderType: "human" };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
    }
  });
}
