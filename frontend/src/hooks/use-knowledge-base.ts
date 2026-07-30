import { useQuery } from "@tanstack/react-query";
import { KnowledgeDocument } from "@/types";

export function useKnowledgeDocuments() {
  return useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: async (): Promise<KnowledgeDocument[]> => {
      return [
        { id: "1", name: "Product_Manual.pdf", type: "pdf", size: 1024000, status: "ready", createdAt: new Date().toISOString() }
      ];
    }
  });
}
