import { useQuery } from "@tanstack/react-query";
import { AiAgent } from "@/types";

export function useAiAgents() {
  return useQuery({
    queryKey: ["ai-agents"],
    queryFn: async (): Promise<AiAgent[]> => {
      return [
        { id: "1", name: "Support Bot", role: "Customer Support", description: "Handles basic queries", status: "active" }
      ];
    }
  });
}
