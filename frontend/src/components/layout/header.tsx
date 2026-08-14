"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Search, Sun, Moon, Menu, MessageSquare, X, User, Phone, Mail, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  content: string;
  createdAt: string;
  conversationId: string;
  contactName: string;
  contactPhone: string;
  status: string;
}

interface SearchResult {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  handlerType?: string;
  type: 'contact' | 'conversation';
}

export function Header() {
  const { setTheme, theme } = useTheme();
  const { logout, user } = useAuthStore();
  const { toggleMobile } = useSidebarStore();
  const router = useRouter();

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ contacts: SearchResult[]; conversations: SearchResult[] }>({ contacts: [], conversations: [] });
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await api.get("/notifications?limit=10");
      setNotifications(res.data);
      setNotifCount(res.data.length);
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notif on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults({ contacts: [], conversations: [] });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [searchError, setSearchError] = useState("");

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults({ contacts: [], conversations: [] });
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
      if (res.data.error) setSearchError(res.data.error);
    } catch (err: any) {
      console.error("Search failed:", err);
      setSearchError(err.response?.data?.message || err.message || "Search gagal");
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, doSearch]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const hasResults = searchResults.contacts.length > 0 || searchResults.conversations.length > 0;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/60 px-4 md:px-6 backdrop-blur-xl transition-all">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={toggleMobile}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search trigger */}
          <button
            onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
            className="hidden sm:flex w-full max-w-sm items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Cari kontak, percakapan...</span>
            <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono border">⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Search icon - mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => { setShowNotif(!showNotif); if (!showNotif) loadNotifications(); }}
            >
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Button>

            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-[360px] bg-card border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <span className="text-sm font-semibold">Chat Masuk Terbaru</span>
                  <button onClick={() => setShowNotif(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 transition-colors"
                        onClick={() => { router.push('/conversations'); setShowNotif(false); }}
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{n.contactName}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(n.createdAt)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{n.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Belum ada chat masuk
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="border-t px-4 py-2.5 text-center">
                    <button onClick={() => { router.push('/conversations'); setShowNotif(false); }} className="text-xs text-primary hover:underline font-medium">
                      Lihat semua percakapan →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.name?.[0] || 'A'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2 border-b mb-1">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block">{user?.role || 'USER'}</span>
              </div>
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { 
                toast.success("Sampai jumpa! 👋", { description: "Anda telah berhasil keluar." });
                setTimeout(() => { logout(); window.location.href = '/login'; }, 800);
              }} className="text-destructive cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search Modal Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults({ contacts: [], conversations: [] }); }}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-card border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari kontak atau percakapan..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchResults({ contacts: [], conversations: [] }); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono border text-muted-foreground">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {searching && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Mencari...</div>
              )}

              {!searching && searchQuery.length >= 2 && !hasResults && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Tidak ditemukan hasil untuk "{searchQuery}"
                  {searchError && (
                    <p className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-3 py-1.5 mx-4">
                      Error: {searchError}
                    </p>
                  )}
                </div>
              )}

              {!searching && searchQuery.length < 2 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Ketik minimal 2 karakter untuk mencari
                </div>
              )}

              {/* Contacts */}
              {searchResults.contacts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    Kontak
                  </div>
                  {searchResults.contacts.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => { router.push('/contacts'); setShowSearch(false); setSearchQuery(""); }}
                    >
                      <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{c.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                          {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Conversations */}
              {searchResults.conversations.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    Percakapan
                  </div>
                  {searchResults.conversations.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => { router.push('/conversations'); setShowSearch(false); setSearchQuery(""); }}
                    >
                      <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{c.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{c.phone}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            c.status === 'AI_HANDLING' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-blue-500/15 text-blue-500'
                          }`}>
                            {c.handlerType === 'AI' ? '🤖 AI' : '👤 Human'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
