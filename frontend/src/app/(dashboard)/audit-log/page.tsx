"use client";

import { useAuditLogs } from "@/hooks/use-audit-logs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AuditLogPage() {
  const { data: logs } = useAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Track system activity and changes.</p>
      </div>

      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{log.user}</TableCell>
                <TableCell className="font-mono text-xs bg-muted/50 rounded px-2 py-1 w-fit">{log.action}</TableCell>
                <TableCell>{log.resource}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">{log.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
