"use client";

import { useContactDetail } from "@/hooks/use-contacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const { data: contact } = useContactDetail(params.id);

  if (!contact) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-2xl">{contact.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
          <p className="text-muted-foreground">{contact.phone}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <p className="font-medium capitalize">{contact.status}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Labels</span>
              <div className="flex gap-2 mt-1">
                {contact.labels.length > 0 ? contact.labels.map(l => (
                  <Badge key={l}>{l}</Badge>
                )) : <p className="text-sm">None</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No notes available for this contact.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
