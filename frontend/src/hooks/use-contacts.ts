import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Contact } from "@/types";

export function useContacts(filters: any) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: async (): Promise<{ data: Contact[], total: number }> => {
      const res = await api.get("/contacts", { params: filters });
      return res.data;
    }
  });
}

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async (): Promise<Contact> => {
      const res = await api.get(`/contacts?id=${id}`);
      return res.data;
    },
    enabled: !!id
  });
}

