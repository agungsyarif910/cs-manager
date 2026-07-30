import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      return [
        { id: "1", name: "Admin", email: "admin@example.com", role: "admin", status: "active", createdAt: new Date().toISOString() }
      ];
    }
  });
}
