"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, CheckCircle, XCircle, Clock, Trash2, Download } from "lucide-react";
import api from "@/lib/api";

interface Registration {
  id: string;
  name: string;
  phone: string;
  program: string;
  status: string;
  paymentDeadline: string;
  paymentNote: string | null;
  paidAt: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Menunggu Bayar", variant: "outline" },
  WAITING_PAYMENT: { label: "Proses Bayar", variant: "secondary" },
  PAID: { label: "Lunas", variant: "default" },
  EXPIRED: { label: "Kadaluarsa", variant: "destructive" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
};

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => { loadData(); }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await api.get(`/registrations?${params}`);
      setRegistrations(res.data);
    } catch (err) {
      console.error("Failed to load registrations:", err);
    }
    setLoading(false);
  };

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      await api.patch("/registrations", { id, action });
      await loadData();
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    }
    setActionLoading("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus registrasi ini?")) return;
    setActionLoading(id);
    try {
      await api.delete(`/registrations?id=${id}`);
      await loadData();
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    }
    setActionLoading("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const exportCSV = () => {
    const headers = ["Nama", "No HP", "Program", "Status", "Deadline", "Tanggal Daftar"];
    const rows = filteredData.map(r => [
      r.name,
      `\t${r.phone}`,
      r.program,
      statusConfig[r.status]?.label || r.status,
      new Date(r.paymentDeadline).toLocaleString("id-ID"),
      new Date(r.createdAt).toLocaleString("id-ID"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const filteredData = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.program.toLowerCase().includes(q);
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const isExpired = (deadline: string) => new Date(deadline) < new Date();

  // Stats
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === "PENDING" || r.status === "WAITING_PAYMENT").length,
    paid: registrations.filter(r => r.status === "PAID").length,
    expired: registrations.filter(r => r.status === "EXPIRED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
        <p className="text-muted-foreground">Kelola pendaftaran customer via chat WhatsApp.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 via-background to-background border-blue-500/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 via-background to-background border-amber-500/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Menunggu Bayar</p>
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Lunas</p>
            <p className="text-2xl font-bold text-emerald-500">{stats.paid}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 via-background to-background border-red-500/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Kadaluarsa</p>
            <p className="text-2xl font-bold text-red-500">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Cari nama, HP, program..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING">Menunggu Bayar</option>
          <option value="WAITING_PAYMENT">Proses Bayar</option>
          <option value="PAID">Lunas</option>
          <option value="EXPIRED">Kadaluarsa</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
        <Button variant="outline" size="sm" onClick={loadData}>🔄 Refresh</Button>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>No HP</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deadline Bayar</TableHead>
              <TableHead>Tgl Daftar</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-20 bg-muted rounded animate-pulse"></div></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Belum ada data registrasi
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(reg => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.name}</TableCell>
                  <TableCell>{reg.phone}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{reg.program}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[reg.status]?.variant || "outline"}
                      className={
                        reg.status === "PAID" ? "bg-emerald-500 hover:bg-emerald-600" :
                        reg.status === "PENDING" ? "bg-amber-500 text-white hover:bg-amber-600" :
                        reg.status === "WAITING_PAYMENT" ? "bg-orange-500 text-white hover:bg-orange-600" : ""
                      }
                    >
                      {statusConfig[reg.status]?.label || reg.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={isExpired(reg.paymentDeadline) && reg.status !== "PAID" ? "text-red-500" : ""}>
                      {formatDate(reg.paymentDeadline)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(reg.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(reg.status === "PENDING" || reg.status === "WAITING_PAYMENT") && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            disabled={actionLoading === reg.id}
                            onClick={() => handleAction(reg.id, "CONFIRM_PAID")}
                            title="Konfirmasi Bayar"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            disabled={actionLoading === reg.id}
                            onClick={() => handleAction(reg.id, "EXTEND_DEADLINE")}
                            title="Perpanjang Deadline +24 jam"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            disabled={actionLoading === reg.id}
                            onClick={() => handleAction(reg.id, "CANCEL")}
                            title="Batalkan"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-red-500"
                        disabled={actionLoading === reg.id}
                        onClick={() => handleDelete(reg.id)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
