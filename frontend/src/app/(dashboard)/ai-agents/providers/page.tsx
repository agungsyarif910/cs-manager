"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProvidersPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Providers</h1>
        <p className="text-muted-foreground">Configure connections to LLM providers (OpenAI, Anthropic, etc).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OpenAI Configuration</CardTitle>
          <CardDescription>Default provider for AI generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input type="password" defaultValue="sk-..." />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input defaultValue="gpt-4-turbo" />
          </div>
          <div className="flex gap-2">
             <Button variant="outline">Test Connection</Button>
             <Button>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
