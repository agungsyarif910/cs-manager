"use client";

import { useConversations } from "@/hooks/use-conversations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationsPage() {
  const router = useRouter();
  const { data: conversations, isLoading } = useConversations({});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground">Manage and view all customer interactions.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search customer or phone..." className="pl-8" />
        </div>
        {/* Filters would go here */}
      </div>

      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Handler</TableHead>
              <TableHead>Last Message</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
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
            ) : conversations?.length ? (
              conversations.map((conv) => (
                <TableRow 
                  key={conv.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/conversations/${conv.id}`)}
                >
                  <TableCell className="font-medium">{conv.contact.name}</TableCell>
                  <TableCell>{conv.contact.phone}</TableCell>
                  <TableCell>
                    <Badge variant={conv.status === 'open' ? 'default' : 'secondary'}>
                      {conv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={conv.handler === 'ai' ? 'outline' : 'default'} className={conv.handler === 'ai' ? 'text-emerald-500 border-emerald-500/30' : ''}>
                      {conv.handler.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="truncate max-w-[200px] text-muted-foreground">
                    {conv.lastMessage}
                  </TableCell>
                  <TableCell>
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No conversations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
