import { useQuery } from "@tanstack/react-query";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      return [
        { id: "1", name: "Greeting", category: "Greeting", content: "Hello {{nama}}, welcome!" }
      ];
    }
  });
}
