'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, MessageSquare, Users, Zap, TrendingUp, TrendingDown, Clock, Inbox, Send } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from "@/lib/api";

interface DashboardData {
  totalMessages: number;
  todayMessages: number;
  totalContacts: number;
  activeConversations: number;
  aiMessages: number;
  humanMessages: number;
  aiRate: string;
  weekGrowth: string;
  dailyData: { date: string; ai: number; human: number; messages: number }[];
  pieData: { name: string; value: number; color: string }[];
  recentActivity: { id: string; type: string; message: string; time: string; user: string }[];
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
        <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted rounded animate-pulse mt-2"></div>
        <div className="h-3 w-32 bg-muted rounded animate-pulse mt-2"></div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/stats");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    }
    setLoading(false);
  };

  const growthNum = parseFloat(data?.weekGrowth || '0');
  const isGrowthPositive = growthNum >= 0;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Ringkasan performa AI Customer Service Anda.</p>
        </div>
        <button onClick={loadStats} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pesan</CardTitle>
                <MessageSquare className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(data?.totalMessages || 0).toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  {isGrowthPositive
                    ? <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                    : <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  }
                  <span className={isGrowthPositive ? 'text-emerald-500 mr-1' : 'text-red-500 mr-1'}>
                    {isGrowthPositive ? '+' : ''}{data?.weekGrowth}%
                  </span>
                  dari minggu lalu
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 via-background to-background border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Resolution Rate</CardTitle>
                <Bot className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.aiRate || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.aiMessages || 0} AI / {data?.humanMessages || 0} manual
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/10 via-background to-background border-violet-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pesan Hari Ini</CardTitle>
                <Zap className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.todayMessages || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.totalContacts || 0} total kontak
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 via-background to-background border-amber-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Percakapan Aktif</CardTitle>
                <Users className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.activeConversations || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Chat yang sedang berlangsung
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Volume Pesan</CardTitle>
            <CardDescription>Pesan harian yang ditangani AI vs Manual (7 hari terakhir)</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loading ? (
              <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.dailyData || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ai" name="AI" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="human" name="Manual" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribusi Handler</CardTitle>
            <CardDescription>Pembagian percakapan berdasarkan handler</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 rounded animate-pulse"></div>
            ) : (data?.pieData || []).every(p => p.value === 0) ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data percakapan
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.pieData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(data?.pieData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
          <CardDescription>10 pesan terakhir di seluruh percakapan.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center p-4 border rounded-lg bg-muted/20 animate-pulse h-16"></div>
              ))}
            </div>
          ) : (data?.recentActivity || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada aktivitas</p>
          ) : (
            <div className="space-y-3">
              {(data?.recentActivity || []).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'incoming'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                        : activity.type === 'ai_reply'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                          : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                    }`}>
                      {activity.type === 'incoming'
                        ? <Inbox className="h-4 w-4" />
                        : activity.type === 'ai_reply'
                          ? <Bot className="h-4 w-4" />
                          : <Send className="h-4 w-4" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[400px]">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.user}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap ml-4">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
