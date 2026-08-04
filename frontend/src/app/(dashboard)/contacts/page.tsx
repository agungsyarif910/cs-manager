"use client";

import { useState, useMemo } from "react";
import { useContacts } from "@/hooks/use-contacts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Search, Download, FileSpreadsheet, CalendarDays } from "lucide-react";
import { Contact } from "@/types";

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, refetch } = useContacts({ search });

  // Client-side date filtering (API handles search)
  const filtered = useMemo(() => {
    if (!data?.data) return [];
    let results = data.data;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      results = results.filter(c => new Date(c.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(c => new Date(c.createdAt) <= to);
    }

    return results;
  }, [data?.data, dateFrom, dateTo]);

  // ─── Export Functions ─────────────────────────────────

  const exportToCSV = () => {
    if (!filtered.length) return;

    const headers = ["Name", "Phone", "Email", "Labels", "Status", "Created"];
    const rows = filtered.map(c => [
      c.name,
      `=""${c.phone || ''}""`, // Force Excel to treat phone as text
      c.email || "",
      (c.labels || []).join("; "),
      c.status,
      new Date(c.createdAt).toLocaleDateString("id-ID"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => {
        const val = String(cell || '').replace(/"/g, '""');
        // Don't double-wrap cells that already have = formula
        if (String(cell).startsWith('="')) return cell;
        return `"${val}"`;
      }).join(","))
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

    // Generate Excel-compatible XML (simple .xls format)
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

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Label className="text-xs text-muted-foreground mb-1 block">🔍 Cari nama / nomor</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama atau nomor..."
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Date From */}
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Dari tanggal
          </Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Sampai tanggal
          </Label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              ✕ Reset
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!filtered.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Result Info */}
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
                </TableRow>
              ))
            ) : filtered.length ? (
              filtered.map((contact) => (
                <TableRow 
                  key={contact.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                >
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {hasFilters ? 'Tidak ada kontak yang cocok dengan filter.' : 'Belum ada kontak.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

