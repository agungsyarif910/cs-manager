"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Agent</h1>
          <p className="text-muted-foreground">Agent ID: {params.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active</span>
          <Switch defaultChecked />
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input defaultValue="Support Bot" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input defaultValue="Customer Support" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea defaultValue="Handles basic customer support queries." />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>The core instructions that govern how this AI behaves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea className="font-mono min-h-[300px]" defaultValue="You are a helpful customer support agent..." />
              <Button>Save Prompt</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
             <CardContent className="pt-6 space-y-4">
               <div className="space-y-2">
                 <Label>Greeting Message</Label>
                 <Input defaultValue="Hi! How can I help you today?" />
               </div>
               <div className="space-y-2">
                 <Label>Fallback Message</Label>
                 <Input defaultValue="I'm sorry, I cannot help with that. Let me connect you to a human." />
               </div>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card>
             <CardContent className="pt-6 space-y-4">
               <p className="text-sm text-muted-foreground">Behavior settings go here...</p>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
