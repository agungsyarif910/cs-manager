"use client";

import { useAiAgents } from "@/hooks/use-ai-agents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Plus, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AiAgentsPage() {
  const { data: agents } = useAiAgents();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">Configure and manage your AI assistants.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/ai-agents/providers")}>
            <Settings className="mr-2 h-4 w-4" />
            Providers
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents?.map((agent) => (
          <Card key={agent.id} className="flex flex-col hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push(`/ai-agents/${agent.id}`)}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  {agent.name}
                </CardTitle>
                <CardDescription className="mt-1">{agent.role}</CardDescription>
              </div>
              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className={agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-0' : ''}>
                {agent.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">{agent.description}</p>
            </CardContent>
            <CardFooter className="pt-4 border-t">
              <span className="text-xs text-muted-foreground">Last updated: Today</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
