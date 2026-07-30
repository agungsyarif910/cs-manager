import { useQuery } from "@tanstack/react-query";
import { WorkflowRule } from "@/types";

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: async (): Promise<WorkflowRule[]> => {
      return [
        { id: "1", condition: "keyword contains 'price'", action: "assign_sales", priority: 1, isActive: true }
      ];
    }
  });
}
