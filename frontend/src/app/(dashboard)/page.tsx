'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, MessageSquare, Users, Zap, TrendingUp, Clock } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const dailyData = [
  { date: 'Mon', messages: 120, ai: 95, human: 25 },
  { date: 'Tue', messages: 180, ai: 150, human: 30 },
  { date: 'Wed', messages: 150, ai: 120, human: 30 },
  { date: 'Thu', messages: 210, ai: 175, human: 35 },
  { date: 'Fri', messages: 190, ai: 160, human: 30 },
  { date: 'Sat', messages: 80, ai: 65, human: 15 },
  { date: 'Sun', messages: 60, ai: 50, human: 10 },
];

const pieData = [
  { name: 'AI Handled', value: 815, color: '#10b981' },
  { name: 'Human Handled', value: 175, color: '#6366f1' },
  { name: 'Escalated', value: 45, color: '#f59e0b' },
];

const recentActivity = [
  { id: 1, type: 'escalation', message: 'Customer requested human support', time: '10 mins ago', user: '+1 234 567 8900' },
  { id: 2, type: 'resolution', message: 'AI resolved billing issue', time: '25 mins ago', user: '+1 987 654 3210' },
  { id: 3, type: 'escalation', message: 'Complex technical issue escalated', time: '1 hour ago', user: '+44 123 456 789' },
  { id: 4, type: 'resolution', message: 'AI provided refund instructions', time: '2 hours ago', user: '+1 555 123 4567' },
];

// Assuming useDashboard hook exists, we simulate loading state here
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
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your AI Customer Service performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,035</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                  <span className="text-emerald-500 mr-1">+12%</span> from last week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 via-background to-background border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Resolution Rate</CardTitle>
                <Bot className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">81.5%</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                  <span className="text-blue-500 mr-1">+2.4%</span> from last week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/10 via-background to-background border-violet-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Zap className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">&lt; 3s</div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI instant response
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 via-background to-background border-amber-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
                <Users className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently open chats
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Message Volume</CardTitle>
            <CardDescription>Daily messages handled by AI vs Human</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loading ? (
              <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ai" name="AI Handled" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="human" name="Human Handled" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Resolution Distribution</CardTitle>
            <CardDescription>How messages are being resolved</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events requiring attention or recently resolved.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center p-4 border rounded-lg bg-muted/20 animate-pulse h-16"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${activity.type === 'escalation' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'}`}>
                      {activity.type === 'escalation' ? <Users className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.user}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
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
