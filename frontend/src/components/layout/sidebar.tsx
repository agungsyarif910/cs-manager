"use client";

import Link from "next/link";
import { APP_CONFIG } from "@/lib/config";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  Bot,
  GitBranch,
  FileText,
  Send,
  Wand2,
  UserCog,
  Shield,
  Settings,
  ChevronLeft,
  ClipboardList
} from "lucide-react";
import { useState } from "react";

const { appName, copyrightYear, copyrightName } = APP_CONFIG;

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Registrations", href: "/registrations", icon: ClipboardList },
  { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { name: "AI Agents", href: "/ai-agents", icon: Bot },
  { name: "Workflow", href: "/workflow", icon: GitBranch },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Broadcast", href: "/broadcast", icon: Send },
  { name: "Prompt Builder", href: "/prompt-builder", icon: Wand2 },
  { name: "Users", href: "/users", icon: UserCog },
  { name: "Audit Log", href: "/audit-log", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-card/50 glass transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && <span className="font-bold text-lg bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">{appName}</span>}
        {collapsed && <span className="font-bold text-lg text-primary ml-1">{appName.substring(0, 2)}</span>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-muted"
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        {!collapsed && (
          <div className="text-xs text-muted-foreground text-center">
            &copy; {copyrightYear} {copyrightName}
          </div>
        )}
      </div>
    </div>
  );
}
