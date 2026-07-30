'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Phone, Check, CheckCheck, PauseCircle, PlayCircle, MoreVertical } from "lucide-react";

const mockMessages = [
  { id: 1, text: "Hi, I have a problem with my recent order.", sender: "user", time: "10:30 AM", status: "read" },
  { id: 2, text: "Hello! I'm the AI assistant. I can help you with that. Could you please provide your order number?", sender: "bot", time: "10:30 AM", status: "read", isAi: true },
  { id: 3, text: "It's ORD-12345", sender: "user", time: "10:32 AM", status: "read" },
  { id: 4, text: "Thank you. I see your order ORD-12345 is currently in transit and should arrive by tomorrow.", sender: "bot", time: "10:32 AM", status: "read", isAi: true },
  { id: 5, text: "But the tracking says it was delivered?", sender: "user", time: "10:35 AM", status: "read" },
  { id: 6, text: "I apologize for the confusion. Let me escalate this to a human agent who can investigate with the carrier.", sender: "bot", time: "10:35 AM", status: "read", isAi: true },
  { id: 7, text: "Hi there, I'm taking over this chat. Let me check the carrier details right away.", sender: "agent", time: "10:38 AM", status: "delivered", isAi: false },
];

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = React.useState(mockMessages);
  const [input, setInput] = React.useState('');
  const [aiEnabled, setAiEnabled] = React.useState(false); // human took over in the mock

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = {
      id: Date.now(),
      text: input,
      sender: "agent",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent",
      isAi: false
    };
    setMessages([...messages, newMessage]);
    setInput('');
  };

  const toggleAi = () => setAiEnabled(!aiEnabled);

  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
      
      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col h-full shadow-md border-muted/50 overflow-hidden">
        <CardHeader className="border-b bg-card py-4 px-6 flex flex-row justify-between items-center z-10">
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="bg-primary/10 text-primary">US</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">+1 (555) 123-4567</CardTitle>
              <div className="flex items-center mt-1">
                <Badge variant={aiEnabled ? "default" : "secondary"} className="text-xs font-normal">
                  {aiEnabled ? "AI Active" : "Human Mode"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={aiEnabled ? "outline" : "default"} 
              size="sm" 
              onClick={toggleAi}
              className="hidden sm:flex"
            >
              {aiEnabled ? (
                <><PauseCircle className="h-4 w-4 mr-2" /> Pause AI</>
              ) : (
                <><PlayCircle className="h-4 w-4 mr-2" /> Resume AI</>
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="space-y-6">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              const isBot = msg.isAi;
              
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex max-w-[80%] ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
                    
                    <Avatar className={`h-8 w-8 mt-auto flex-shrink-0 ${isUser ? 'mr-2' : 'ml-2'}`}>
                      {isUser ? (
                        <AvatarFallback className="bg-slate-200 text-slate-600 dark:bg-slate-800"><User className="h-4 w-4" /></AvatarFallback>
                      ) : isBot ? (
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50"><Bot className="h-4 w-4" /></AvatarFallback>
                      ) : (
                        <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900/50">Me</AvatarFallback>
                      )}
                    </Avatar>

                    <div className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                        isUser 
                          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-none text-slate-800 dark:text-slate-200' 
                          : isBot
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-br-none text-emerald-900 dark:text-emerald-100'
                            : 'bg-blue-600 dark:bg-blue-700 rounded-br-none text-white'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      
                      <div className="flex items-center mt-1 space-x-1 text-[10px] text-muted-foreground">
                        <span>{msg.time}</span>
                        {!isUser && (
                          <span>
                            {msg.status === 'sent' && <Check className="h-3 w-3" />}
                            {msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                            {msg.status === 'read' && <CheckCheck className="h-3 w-3 text-blue-500" />}
                          </span>
                        )}
                        {!isUser && isBot && (
                          <span className="flex items-center text-emerald-600 dark:text-emerald-400 ml-1">
                            <Bot className="h-3 w-3 mr-0.5" /> AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <CardFooter className="p-4 bg-card border-t">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="flex w-full items-center space-x-2"
          >
            <Input 
              type="text" 
              placeholder={aiEnabled ? "AI is handling this chat (type to take over)..." : "Type your message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-muted/50 border-muted focus-visible:ring-primary/50"
            />
            <Button type="submit" size="icon" disabled={!input.trim()} className="bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>

      {/* Sidebar Info */}
      <Card className="w-full md:w-80 h-fit shrink-0">
        <CardHeader>
          <CardTitle className="text-base">Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-3 p-4 bg-muted/30 rounded-lg border">
            <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
              <AvatarFallback className="text-lg">US</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="font-semibold">+1 (555) 123-4567</h3>
              <p className="text-sm text-muted-foreground">Customer</p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Phone className="h-3 w-3 mr-2" /> Call
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Profile
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Conversation Info</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Status:</div>
              <div className="font-medium text-amber-500">Escalated</div>
              <div className="text-muted-foreground">Channel:</div>
              <div className="font-medium">WhatsApp</div>
              <div className="text-muted-foreground">Created:</div>
              <div className="font-medium">Today, 10:30 AM</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Tags</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Shipping Issue</Badge>
              <Badge variant="outline">Escalated</Badge>
              <Badge variant="outline">High Priority</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
