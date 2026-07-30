import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Contact } from "@/types";

export function useContacts(filters: any) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: async (): Promise<{ data: Contact[], total: number }> => {
      // return (await api.get("/contacts", { params: filters })).data;
      return {
        data: [
          { id: "c1", name: "Alice Smith", phone: "+9876543210", email: "alice@example.com", labels: ["VIP"], tags: ["Lead"], status: "active", createdAt: "2026-05-10" }
        ],
        total: 1
      };
    }
  });
}

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async (): Promise<Contact> => {
      // return (await api.get(`/contacts/${id}`)).data;
      return { id, name: "Alice Smith", phone: "+9876543210", labels: [], tags: [], status: "active", createdAt: "2026-05-10" };
    },
    enabled: !!id
  });
}
