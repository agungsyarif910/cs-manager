import { useQuery } from "@tanstack/react-query";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return {
        companyName: "Acme Corp",
        timezone: "Asia/Jakarta"
      };
    }
  });
}
