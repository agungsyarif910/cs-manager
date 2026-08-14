"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogIn, LogOut, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  userRole: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = filter ? `?action=${filter}&limit=100` : '?limit=100';
      const res = await api.get(`/audit-log${params}`);
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
    setLoading(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1">
            <LogIn className="h-3 w-3" /> LOGIN
          </Badge>
        );
      case 'LOGOUT':
        return (
          <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30 gap-1">
            <LogOut className="h-3 w-3" /> LOGOUT
          </Badge>
        );
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Riwayat akses dan aktivitas pengguna.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filter:</span>
        {['', 'LOGIN', 'LOGOUT'].map(f => (
          <Button
            key={f || 'all'}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-xs h-7"
          >
            {f === '' ? 'Semua' : f === 'LOGIN' ? '🟢 Login' : '🟠 Logout'}
          </Button>
        ))}
      </div>

      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Waktu</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="hidden md:table-cell">Browser</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[160px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                </TableRow>
              ))
            ) : logs.length > 0 ? (
              logs.map((log) => {
                // Parse browser from user agent
                const ua = log.userAgent || '';
                let browser = '-';
                if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
                else if (ua.includes('Edg')) browser = 'Edge';
                else if (ua.includes('Firefox')) browser = 'Firefox';
                else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
                else if (ua) browser = 'Other';

                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{log.user}</span>
                        <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {browser}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada log aktivitas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && logs.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Menampilkan {logs.length} log terbaru
        </p>
      )}
    </div>
  );
}
