import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { DashboardStats, ChartData } from "@/types";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // const { data } = await api.get("/dashboard/stats");
      // return data;
      
      // Mock data
      return {
        totalMessages: 12450,
        messagesToday: 320,
        aiMessages: 10500,
        humanMessages: 1950,
        avgResponseTime: 1.2,
        successRate: 85.5,
        escalationRate: 14.5,
        activeContacts: 2845
      };
    }
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: async (): Promise<{ daily: ChartData[], distribution: any[] }> => {
      // Mock data
      return {
        daily: [
          { date: "2026-07-20", value: 400 },
          { date: "2026-07-21", value: 300 },
          { date: "2026-07-22", value: 550 },
          { date: "2026-07-23", value: 480 },
          { date: "2026-07-24", value: 600 }
        ],
        distribution: [
          { name: "Resolved by AI", value: 75 },
          { name: "Escalated to Human", value: 25 }
        ]
      };
    }
  });
}
