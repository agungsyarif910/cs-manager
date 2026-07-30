import { useQuery } from "@tanstack/react-query";
import { Broadcast } from "@/types";

export function useBroadcasts() {
  return useQuery({
    queryKey: ["broadcasts"],
    queryFn: async (): Promise<Broadcast[]> => {
      return [
        { id: "1", name: "Promo 2026", templateId: "1", status: "completed", progress: 100, successCount: 950, failedCount: 50, totalTargets: 1000 }
      ];
    }
  });
}
