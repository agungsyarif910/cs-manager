"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, LogIn, LogOut, Filter, Download, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import * as XLSX from "xlsx";

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
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [filter, dateFrom, dateTo]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (filter) params.set('action', filter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await api.get(`/audit-log?${params.toString()}`);
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

  const getBrowser = (ua: string) => {
    if (!ua) return '-';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
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

  // ===== Export to Excel =====
  const exportToExcel = () => {
    if (logs.length === 0) return;

    const data = logs.map((log) => ({
      'Waktu': formatDate(log.timestamp),
      'User': log.user,
      'Email': log.userEmail,
      'Role': log.userRole,
      'Action': log.action,
      'IP Address': log.ipAddress,
      'Browser': getBrowser(log.userAgent),
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Waktu
      { wch: 20 }, // User
      { wch: 30 }, // Email
      { wch: 12 }, // Role
      { wch: 10 }, // Action
      { wch: 18 }, // IP Address
      { wch: 12 }, // Browser
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `audit-log-${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Riwayat akses dan aktivitas pengguna.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={logs.length === 0} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
        {/* Action Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
            <Filter className="h-3 w-3" /> Action
          </label>
          <div className="flex gap-1.5">
            {['', 'LOGIN', 'LOGOUT'].map(f => (
              <Button
                key={f || 'all'}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className="text-xs h-8"
              >
                {f === '' ? 'Semua' : f === 'LOGIN' ? '🟢 Login' : '🟠 Logout'}
              </Button>
            ))}
          </div>
        </div>

        {/* Date From */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Dari Tanggal
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 text-sm w-[160px]"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Sampai Tanggal
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 text-sm w-[160px]"
          />
        </div>

        {/* Clear Filters */}
        {(dateFrom || dateTo || filter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(''); setDateTo(''); setFilter(''); }}
            className="text-xs h-8 text-muted-foreground"
          >
            ✕ Reset Filter
          </Button>
        )}
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
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : logs.length > 0 ? (
              logs.map((log) => (
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
                    <Badge variant="outline" className="text-xs">{log.userRole}</Badge>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {log.ipAddress}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {getBrowser(log.userAgent)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {dateFrom || dateTo || filter ? 'Tidak ada log untuk filter ini' : 'Belum ada log aktivitas'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && logs.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Menampilkan {logs.length} log
          {dateFrom && ` dari ${new Date(dateFrom).toLocaleDateString('id-ID')}`}
          {dateTo && ` sampai ${new Date(dateTo).toLocaleDateString('id-ID')}`}
        </p>
      )}
    </div>
  );
}
