"use client";

import { useBroadcasts } from "@/hooks/use-broadcasts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function BroadcastPage() {
  const { data: broadcasts } = useBroadcasts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broadcast Campaigns</h1>
          <p className="text-muted-foreground">Send bulk messages to your contacts.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Broadcast
        </Button>
      </div>

      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Success / Failed</TableHead>
              <TableHead>Total Targets</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {broadcasts?.map((bc) => (
              <TableRow key={bc.id}>
                <TableCell className="font-medium">{bc.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={bc.status === 'completed' ? 'text-emerald-500 border-emerald-500' : ''}>
                    {bc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full max-w-[100px] bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${bc.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{bc.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-emerald-500 font-medium">{bc.successCount}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-destructive font-medium">{bc.failedCount}</span>
                </TableCell>
                <TableCell>{bc.totalTargets}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
