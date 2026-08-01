"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ArrowLeft, Bot, User, Clock, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

interface Conversation {
  id: string;
  customer: string;
  phone: string;
  status: string;
  handlerType: string;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
}

interface Message {
  id: string;
  direction: string;
  type: string;
  content: string;
  isFromAi: boolean;
  deliveryStatus: string;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  status: string;
  handlerType: string;
  contact: { name: string; phone: string };
  messages: Message[];
  agent?: { name: string };
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState(false);

  const toggleHandler = async (convId: string, newHandler: 'AI' | 'HUMAN') => {
    setToggling(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      await api.patch("/conversations", {
        id: convId,
        status: newHandler === 'AI' ? 'AI_HANDLING' : 'HUMAN_HANDLING',
        handlerType: newHandler
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Refresh detail
      if (selected) {
        setSelected({
          ...selected,
          status: newHandler === 'AI' ? 'AI_HANDLING' : 'HUMAN_HANDLING',
          handlerType: newHandler
        });
      }
      // Also refresh list
      loadConversations();
    } catch (err) {
      console.error("Failed to toggle handler:", err);
    }
    setToggling(false);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/conversations");
      setConversations(res.data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
    setLoading(false);
  };

  const openConversation = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/conversations?id=${id}`);
      setSelected(res.data);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
    setLoadingDetail(false);
  };

  const filtered = conversations.filter(c =>
    c.customer.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const formatTime = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Chat Detail View
  if (selected) {
    const isAI = selected.handlerType === 'AI';
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selected.contact?.name}</h2>
            <p className="text-sm text-muted-foreground">{selected.contact?.phone}</p>
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <Badge variant={selected.status === 'AI_HANDLING' ? 'outline' : 'default'} className={selected.status === 'AI_HANDLING' ? 'text-emerald-400 border-emerald-500/30' : selected.status === 'HUMAN_HANDLING' ? 'text-blue-400 border-blue-500/30' : ''}>
              {selected.status}
            </Badge>
            <Badge variant="outline" className={isAI ? 'text-emerald-400 border-emerald-500/30' : 'text-blue-400 border-blue-500/30'}>
              {isAI ? '🤖 AI' : '👤 Human'}
            </Badge>
            {isAI ? (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                disabled={toggling}
                onClick={() => toggleHandler(selected.id, 'HUMAN')}
              >
                <User className="h-3.5 w-3.5 mr-1" />
                {toggling ? 'Switching...' : 'Takeover Human'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                disabled={toggling}
                onClick={() => toggleHandler(selected.id, 'AI')}
              >
                <Bot className="h-3.5 w-3.5 mr-1" />
                {toggling ? 'Switching...' : 'Kembalikan ke AI'}
              </Button>
            )}
          </div>
        </div>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {selected.messages?.length || 0} pesan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {loadingDetail ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <Skeleton className="h-16 w-[60%] rounded-xl" />
                  </div>
                ))
              ) : selected.messages?.length > 0 ? (
                selected.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.direction === 'INBOUND'
                        ? 'bg-muted/50 rounded-bl-sm'
                        : msg.isFromAi
                          ? 'bg-emerald-500/20 border border-emerald-500/30 rounded-br-sm'
                          : 'bg-primary/20 border border-primary/30 rounded-br-sm'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {msg.direction === 'INBOUND' ? (
                          <User className="h-3 w-3 text-muted-foreground" />
                        ) : msg.isFromAi ? (
                          <Bot className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <User className="h-3 w-3 text-primary" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {msg.direction === 'INBOUND' ? 'Customer' : msg.isFromAi ? 'AI Bot' : 'CS Agent'}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                        {msg.direction === 'OUTBOUND' && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {msg.deliveryStatus === 'SENT' ? '✓✓' : msg.deliveryStatus === 'DELIVERED' ? '✓✓' : msg.deliveryStatus === 'READ' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Belum ada pesan</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Conversations List View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground">Lihat semua percakapan customer & AI.</p>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari customer atau nomor..."
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations}>🔄 Refresh</Button>
      </div>

      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Handler</TableHead>
              <TableHead>Pesan Terakhir</TableHead>
              <TableHead>Tanggal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((conv) => (
                <TableRow
                  key={conv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openConversation(conv.id)}
                >
                  <TableCell className="font-medium">{conv.customer}</TableCell>
                  <TableCell>{conv.phone}</TableCell>
                  <TableCell>
                    <Badge variant={conv.status === 'AI_HANDLING' || conv.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {conv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={conv.handlerType === 'AI' ? 'text-emerald-400 border-emerald-500/30' : ''}>
                      {conv.handlerType}
                    </Badge>
                  </TableCell>
                  <TableCell className="truncate max-w-[200px] text-muted-foreground">
                    {conv.lastMessage}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(conv.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {search ? 'Tidak ada hasil' : 'Belum ada percakapan'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
