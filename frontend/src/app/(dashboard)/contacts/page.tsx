"use client";

import { useState, useMemo } from "react";
import { useContacts } from "@/hooks/use-contacts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Download, FileSpreadsheet, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Contact } from "@/types";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const emptyForm = { name: "", phone: "", email: "", status: "ACTIVE" };

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useContacts({ search });

  // Client-side date filtering
  const filtered = useMemo(() => {
    if (!data?.data) return [];
    let results = data.data;
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      results = results.filter(c => new Date(c.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      results = results.filter(c => new Date(c.createdAt) <= to);
    }
    return results;
  }, [data?.data, dateFrom, dateTo]);

  // ─── CRUD Handlers ─────────────────────────────────

  const openAdd = () => {
    setForm(emptyForm);
    setEditId("");
    setDialogMode("add");
    setDialogOpen(true);
  };

  const openEdit = (c: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({ name: c.name, phone: c.phone, email: c.email || "", status: c.status || "ACTIVE" });
    setEditId(c.id);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.phone.trim()) return alert("Nomor telepon wajib diisi");
    setSaving(true);
    try {
      if (dialogMode === "add") {
        await api.post("/contacts", form);
      } else {
        await api.patch("/contacts", { id: editId, ...form });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setDialogOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menyimpan kontak");
    }
    setSaving(false);
  };

  const confirmDelete = (c: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(c);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/contacts?id=${deleteTarget.id}`);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menghapus kontak");
    }
    setDeleting(false);
  };

  // ─── Export Functions ─────────────────────────────────

  const exportToCSV = () => {
    if (!filtered.length) return;
    const headers = ["Name", "Phone", "Email", "Labels", "Status", "Created"];
    const rows = filtered.map(c => [
      c.name,
      "\t" + (c.phone || ''),
      c.email || "",
      (c.labels || []).join("; "),
      c.status,
      new Date(c.createdAt).toLocaleDateString("id-ID"),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!filtered.length) return;
    const headers = ["Name", "Phone", "Email", "Labels", "Status", "Created"];
    let tableHtml = '<table><thead><tr>';
    headers.forEach(h => { tableHtml += `<th style="font-weight:bold;background:#4472C4;color:white;padding:8px">${h}</th>`; });
    tableHtml += '</tr></thead><tbody>';
    filtered.forEach(c => {
      tableHtml += '<tr>';
      tableHtml += `<td>${c.name || ''}</td>`;
      tableHtml += `<td style="mso-number-format:'\\@'">${c.phone || ''}</td>`;
      tableHtml += `<td>${c.email || ''}</td>`;
      tableHtml += `<td>${(c.labels || []).join(', ')}</td>`;
      tableHtml += `<td>${c.status || ''}</td>`;
      tableHtml += `<td>${new Date(c.createdAt).toLocaleDateString('id-ID')}</td>`;
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
      <x:ExcelWorksheet><x:Name>Contacts</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>${tableHtml}</body></html>`;
    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contacts_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); };
  const hasFilters = search || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Kelola database pelanggan Anda.
            {!isLoading && data?.total ? ` Total: ${data.total} kontak` : ''}
          </p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Label className="text-xs text-muted-foreground mb-1 block">🔍 Cari nama / nomor</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Cari nama atau nomor..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Dari tanggal</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Sampai tanggal</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>✕ Reset</Button>}
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!filtered.length}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!filtered.length}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
        </div>
      </div>

      {hasFilters && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Menampilkan {filtered.length} kontak
          {search && ` untuk "${search}"`}
          {dateFrom && ` dari ${new Date(dateFrom).toLocaleDateString('id-ID')}`}
          {dateTo && ` sampai ${new Date(dateTo).toLocaleDateString('id-ID')}`}
        </p>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length ? (
              filtered.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell>{contact.email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(contact.labels || []).map(label => (
                        <Badge key={label} variant="secondary" className="text-[10px]">{label}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      contact.status?.toLowerCase() === 'active' ? 'text-emerald-500 border-emerald-500/50' : ''
                    }>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(contact.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={(e) => openEdit(contact, e)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={(e) => confirmDelete(contact, e)} title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {hasFilters ? 'Tidak ada kontak yang cocok dengan filter.' : 'Belum ada kontak.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── Add/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Tambah Kontak Baru" : "Edit Kontak"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Nama</Label>
              <Input id="name" placeholder="Nama kontak" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Nomor Telepon *</Label>
              <Input id="phone" placeholder="6281234567890" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} disabled={dialogMode === "edit"} />
              {dialogMode === "edit" && <p className="text-xs text-muted-foreground mt-1">Nomor telepon tidak bisa diubah</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : dialogMode === "add" ? "Tambah" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hapus Kontak</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus <strong>{deleteTarget?.name}</strong> ({deleteTarget?.phone})? Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
