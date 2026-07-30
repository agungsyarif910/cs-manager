"use client";

import { useTemplates } from "@/hooks/use-templates";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default function TemplatesPage() {
  const { data: templates } = useTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-muted-foreground">Manage templates for broadcasts and quick replies.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {template.name}
              </CardTitle>
              <Badge variant="outline">{template.category}</Badge>
            </CardHeader>
            <CardContent>
              <div className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded-md border font-mono">
                {template.content}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full">Edit Template</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
