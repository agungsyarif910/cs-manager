"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, Sun, Moon, Menu, MessageSquare, X } from "lucide-react";
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

export function Header() {
  const { setTheme, theme } = useTheme();
  const { logout, user } = useAuthStore();
  const { toggleMobile } = useSidebarStore();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await api.get("/notifications?limit=10");
      setNotifications(res.data);
      setNotifCount(res.data.length);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/60 px-4 md:px-6 backdrop-blur-xl transition-all">
      <div className="flex items-center space-x-3">
        {/* Hamburger - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={toggleMobile}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        <div className="hidden sm:flex w-full max-w-sm items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search... (Cmd+K)"
            className="h-9 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
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

          {/* Notification Dropdown */}
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
                      onClick={() => {
                        router.push('/conversations');
                        setShowNotif(false);
                      }}
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
                        <span className="text-[10px] text-muted-foreground/70">{n.contactPhone}</span>
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
                  <button
                    onClick={() => { router.push('/conversations'); setShowNotif(false); }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Lihat semua percakapan →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.name?.[0] || 'A'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { 
              toast.success("Sampai jumpa! 👋", {
                description: "Anda telah berhasil keluar.",
              });
              setTimeout(() => {
                logout(); 
                window.location.href = '/login';
              }, 800);
            }} className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
