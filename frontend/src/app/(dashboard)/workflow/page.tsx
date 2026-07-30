"use client";

import { useWorkflows } from "@/hooks/use-workflows";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function WorkflowPage() {
  const { data: workflows } = useWorkflows();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Builder</h1>
          <p className="text-muted-foreground">Define rules for routing and automated actions.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      <div className="space-y-4">
        {workflows?.map((rule) => (
          <Card key={rule.id}>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg">Priority: {rule.priority}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active</span>
                <Switch defaultChecked={rule.isActive} />
              </div>
            </CardHeader>
            <CardContent className="flex items-center gap-4 bg-muted/20 py-4">
              <div className="flex-1 p-3 rounded-md bg-background border">
                <Badge variant="secondary" className="mb-2">IF</Badge>
                <p className="font-mono text-sm">{rule.condition}</p>
              </div>
              <ArrowRight className="text-muted-foreground" />
              <div className="flex-1 p-3 rounded-md bg-background border">
                <Badge variant="default" className="mb-2 bg-primary/20 text-primary hover:bg-primary/30 border-0">THEN</Badge>
                <p className="font-mono text-sm">{rule.action}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
