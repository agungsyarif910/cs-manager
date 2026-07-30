"use client";

import { useKnowledgeDocuments } from "@/hooks/use-knowledge-base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Table as TableIcon, Database, UploadCloud } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function KnowledgeBasePage() {
  const { data: documents } = useKnowledgeDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">Manage the information your AI agents use to answer questions.</p>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-card/50 glass max-w-md h-12">
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="excel" className="gap-2"><TableIcon className="h-4 w-4" /> Excel/CSV</TabsTrigger>
          <TabsTrigger value="database" className="gap-2"><Database className="h-4 w-4" /> Database</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents" className="space-y-4">
          <Card className="border-dashed border-2 bg-transparent shadow-none cursor-pointer hover:bg-muted/30 transition-colors">
            <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <UploadCloud className="h-10 w-10 mb-4" />
              <p className="font-medium">Drag & drop files here</p>
              <p className="text-sm">Supports PDF, DOCX, TXT (Max 10MB)</p>
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell className="uppercase">{doc.type}</TableCell>
                    <TableCell>{(doc.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={doc.status === 'ready' ? 'text-emerald-500 border-emerald-500' : ''}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="excel">
          <Card>
            <CardHeader>
              <CardTitle>Spreadsheet Data</CardTitle>
              <CardDescription>Upload structured data for exact matching.</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-muted-foreground text-sm">Upload area for Excel/CSV goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Connections</CardTitle>
              <CardDescription>Connect directly to your SQL databases.</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-muted-foreground text-sm">Connection list goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
