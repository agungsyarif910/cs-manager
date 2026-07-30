"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PromptBuilderPage() {
  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Builder</h1>
          <p className="text-muted-foreground">Construct powerful system prompts visually.</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Identity & Role</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Who is the AI? What does it do?" className="min-h-[100px] font-mono" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Knowledge & Context</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="What does the AI know?" className="min-h-[100px] font-mono" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Behavior & Tone</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="How should it act? e.g., professional, friendly" className="min-h-[100px] font-mono" />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="w-[400px] hidden xl:flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>The composed system prompt.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto font-mono text-xs bg-black/5 dark:bg-black/20 p-4 rounded-md mx-6 mb-4">
            You are a helpful assistant...
          </CardContent>
          <div className="p-4 border-t bg-card">
            <Button className="w-full">Save Prompt Template</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
