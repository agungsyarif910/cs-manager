import { useQuery } from "@tanstack/react-query";

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      return [
        { id: "1", timestamp: new Date().toISOString(), user: "Admin", action: "LOGIN", resource: "Auth", ipAddress: "192.168.1.1" }
      ];
    }
  });
}
