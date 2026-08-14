"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Send, RefreshCw, X, CheckSquare, Square, Loader2, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

interface Broadcast {
  id: string;
  name: string;
  templateName: string;
  status: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  progress: number;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
}

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [searchContact, setSearchContact] = useState("");

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/broadcast");
      setBroadcasts(res.data);
    } catch (err) {
      console.error("Failed to load broadcasts:", err);
    }
    setLoading(false);
  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await api.get("/contacts");
      setContacts(res.data);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
    setLoadingContacts(false);
  };

  const openForm = () => {
    setShowForm(true);
    setName("");
    setMessage("");
    setSelectedIds(new Set());
    setSendResult("");
    loadContacts();
  };

  const toggleContact = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const filtered = filteredContacts;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleSend = async () => {
    if (!name.trim() || !message.trim() || selectedIds.size === 0) return;
    setSending(true);
    setSendResult("");
    try {
      const res = await api.post("/broadcast", {
        name: name.trim(),
        message: message.trim(),
        contactIds: Array.from(selectedIds),
      });
      setSendResult(`✅ ${res.data.message}`);
      setTimeout(() => {
        setShowForm(false);
        loadBroadcasts();
      }, 2000);
    } catch (err: any) {
      setSendResult(`❌ ${err.response?.data?.message || err.message}`);
    }
    setSending(false);
  };

  const filteredContacts = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(searchContact.toLowerCase()) ||
    c.phone.includes(searchContact)
  );

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getStatusBadge = (status: string) => {
    const map: any = {
      DRAFT: { color: 'bg-gray-500/15 text-gray-500 border-gray-500/30', label: 'Draft' },
      SCHEDULED: { color: 'bg-blue-500/15 text-blue-500 border-blue-500/30', label: 'Terjadwal' },
      PROCESSING: { color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30', label: 'Mengirim...' },
      COMPLETED: { color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', label: 'Selesai' },
      CANCELLED: { color: 'bg-red-500/15 text-red-500 border-red-500/30', label: 'Dibatalkan' },
    };
    const s = map[status] || map.DRAFT;
    return <Badge className={`${s.color} gap-1`}>{s.label}</Badge>;
  };

  // ===== Form View =====
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
            <X className="h-4 w-4 mr-2" /> Batal
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Broadcast Baru</h1>
            <p className="text-muted-foreground">Kirim pesan massal ke kontak terpilih.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Message */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">📝 Pesan Broadcast</CardTitle>
              <CardDescription>Gunakan {"{{nama}}"} untuk personalisasi nama kontak.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nama Kampanye</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Promo Agustus 2026" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Isi Pesan</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={"Halo {{nama}}, kami punya info menarik untuk Kakak! 😊"}
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">{message.length} karakter</p>
              </div>

              {message && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Preview:</label>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
                    {message.replace(/\{\{nama\}\}/gi, 'Adam').replace(/\{\{phone\}\}/gi, '6281234567890')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Contact Selection */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">👥 Pilih Penerima</CardTitle>
              <CardDescription>{selectedIds.size} dari {contacts.length} kontak dipilih</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={searchContact}
                  onChange={e => setSearchContact(e.target.value)}
                  placeholder="Cari nama/nomor..."
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={selectAll} className="whitespace-nowrap">
                  {selectedIds.size === filteredContacts.length ? 'Batal Semua' : 'Pilih Semua'}
                </Button>
              </div>

              <div className="max-h-[320px] overflow-y-auto border rounded-lg divide-y">
                {loadingContacts ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                  ))
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map(c => (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.has(c.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleContact(c.id)}
                    >
                      {selectedIds.has(c.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{c.name || c.phone}</span>
                        <span className="text-xs text-muted-foreground">{c.phone}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-6">Tidak ada kontak</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Send */}
        {sendResult && (
          <div className={`p-3 rounded-lg text-sm ${sendResult.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {sendResult}
          </div>
        )}

        <Button
          onClick={handleSend}
          disabled={!name.trim() || !message.trim() || selectedIds.size === 0 || sending}
          className="w-full gap-2"
          size="lg"
        >
          {sending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim ke {selectedIds.size} kontak...</>
          ) : (
            <><Send className="h-4 w-4" /> Kirim Broadcast ke {selectedIds.size} Kontak</>
          )}
        </Button>
      </div>
    );
  }

  // ===== List View =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            Broadcast
          </h1>
          <p className="text-muted-foreground">Kirim pesan massal ke kontak WhatsApp.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadBroadcasts}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openForm} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Broadcast Baru
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kampanye</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Berhasil / Gagal</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="hidden md:table-cell">Tanggal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                </TableRow>
              ))
            ) : broadcasts.length > 0 ? (
              broadcasts.map((bc) => (
                <TableRow key={bc.id}>
                  <TableCell>
                    <span className="font-medium">{bc.name}</span>
                    {bc.templateName && (
                      <p className="text-xs text-muted-foreground">Template: {bc.templateName}</p>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(bc.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-[100px] bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${bc.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                          style={{ width: `${bc.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{bc.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-emerald-500 font-medium">{bc.successCount}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-destructive font-medium">{bc.failedCount}</span>
                  </TableCell>
                  <TableCell className="font-medium">{bc.totalCount}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(bc.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada broadcast. Klik "Broadcast Baru" untuk mulai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
