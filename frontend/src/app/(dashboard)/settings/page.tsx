"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

// Helper to load/save settings from backend
async function loadAllSettings(): Promise<Record<string, any>> {
  try {
    const res = await api.get("/settings");
    const map: Record<string, any> = {};
    if (Array.isArray(res.data)) {
      res.data.forEach((s: any) => { map[s.key] = s.value; });
    }
    return map;
  } catch { return {}; }
}

async function saveSetting(key: string, value: any) {
  await api.put(`/settings/${key}`, { value });
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [general, setGeneral] = useState({
    companyName: "My Company",
    timezone: "Asia/Jakarta",
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
    language: "Bahasa Indonesia",
  });

  const [aiConfig, setAiConfig] = useState({
    apiUrl: "https://ai.sumopod.com/v1",
    apiKey: "",
    model: "deepseek-chat",
    embeddingModel: "text-embedding-3-small",
    temperature: "0.7",
    maxTokens: "2048",
    topP: "0.9",
    systemPrompt: "Kamu adalah AI Customer Service yang ramah, profesional, dan membantu.",
  });

  const [waConfig, setWaConfig] = useState({
    apiUrl: "https://api.kirimdev.com/v1",
    apiKey: "",
    phoneNumberId: "",
    webhookSecret: "",
    webhookUrl: "",
  });

  const [autoReply, setAutoReply] = useState({
    outsideHours: "Terima kasih telah menghubungi kami. Saat ini di luar jam operasional.",
    holiday: "Terima kasih telah menghubungi kami. Saat ini kami sedang libur.",
    busy: "Mohon maaf, semua agen kami sedang sibuk.",
    greeting: "Halo! Selamat datang. Ada yang bisa kami bantu hari ini?",
    delayMs: "3000",
  });

  const [notifConfig, setNotifConfig] = useState({
    telegramBotToken: "",
    telegramChatId: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
    enableTelegram: false,
    enableEmail: false,
  });

  // Load settings from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const settings = await loadAllSettings();
        if (settings.general) setGeneral({ ...general, ...settings.general });
        if (settings.ai_config) setAiConfig({ ...aiConfig, ...settings.ai_config });
        if (settings.whatsapp_config) setWaConfig({ ...waConfig, ...settings.whatsapp_config });
        if (settings.auto_reply) setAutoReply({ ...autoReply, ...settings.auto_reply });
        if (settings.notifications) setNotifConfig({ ...notifConfig, ...settings.notifications });
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (section: string, key: string, data: any) => {
    setSaving(true);
    try {
      await saveSetting(key, data);
      toast.success(`${section} berhasil disimpan ke database! ✅`);
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err?.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Memuat settings dari database...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and integrations. Semua perubahan disimpan ke Supabase.</p>
      </div>

      <Tabs defaultValue="general" className="w-full flex gap-6">
        <TabsList className="flex flex-col h-auto w-48 bg-transparent items-start space-y-1 shrink-0">
          <TabsTrigger value="general" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary">General</TabsTrigger>
          <TabsTrigger value="ai" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary">AI Config</TabsTrigger>
          <TabsTrigger value="whatsapp" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary">WhatsApp API</TabsTrigger>
          <TabsTrigger value="autoreply" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Auto-Reply</TabsTrigger>
          <TabsTrigger value="notifications" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Notifications</TabsTrigger>
        </TabsList>
        
        <div className="flex-1 space-y-0">
          {/* General Tab */}
          <TabsContent value="general" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Company information and defaults.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={general.companyName} onChange={(e) => setGeneral({...general, companyName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input value={general.timezone} onChange={(e) => setGeneral({...general, timezone: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Working Hours Start</Label>
                    <Input type="time" value={general.workingHoursStart} onChange={(e) => setGeneral({...general, workingHoursStart: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Working Hours End</Label>
                    <Input type="time" value={general.workingHoursEnd} onChange={(e) => setGeneral({...general, workingHoursEnd: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Input value={general.language} onChange={(e) => setGeneral({...general, language: e.target.value})} />
                </div>
                <Button disabled={saving} onClick={() => handleSave("General", "general", general)}>
                  {saving ? "Menyimpan..." : "💾 Save to Database"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Config Tab */}
          <TabsContent value="ai" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🤖 AI Provider (SumoPod)</CardTitle>
                <CardDescription>Configure your AI engine connection and model parameters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input value={aiConfig.apiUrl} onChange={(e) => setAiConfig({...aiConfig, apiUrl: e.target.value})} placeholder="https://ai.sumopod.com/v1" />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" value={aiConfig.apiKey} onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})} placeholder="sk-your-api-key" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chat Model</Label>
                    <Input value={aiConfig.model} onChange={(e) => setAiConfig({...aiConfig, model: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Embedding Model</Label>
                    <Input value={aiConfig.embeddingModel} onChange={(e) => setAiConfig({...aiConfig, embeddingModel: e.target.value})} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚙️ Model Parameters</CardTitle>
                <CardDescription>Fine-tune AI behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Temperature <span className="text-xs text-muted-foreground">(0-2)</span></Label>
                    <Input type="number" step="0.1" min="0" max="2" value={aiConfig.temperature} onChange={(e) => setAiConfig({...aiConfig, temperature: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input type="number" value={aiConfig.maxTokens} onChange={(e) => setAiConfig({...aiConfig, maxTokens: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Top P <span className="text-xs text-muted-foreground">(0-1)</span></Label>
                    <Input type="number" step="0.1" min="0" max="1" value={aiConfig.topP} onChange={(e) => setAiConfig({...aiConfig, topP: e.target.value})} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📝 Default System Prompt</CardTitle>
                <CardDescription>Base personality and instructions for the AI agent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={aiConfig.systemPrompt}
                    onChange={(e) => setAiConfig({...aiConfig, systemPrompt: e.target.value})}
                  />
                </div>
                <Button disabled={saving} onClick={() => handleSave("AI Config", "ai_config", aiConfig)}>
                  {saving ? "Menyimpan..." : "💾 Save AI Config to Database"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp API Tab */}
          <TabsContent value="whatsapp" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>📱 KirimDev WhatsApp API</CardTitle>
                <CardDescription>Connect to your WhatsApp Business API provider.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input value={waConfig.apiUrl} onChange={(e) => setWaConfig({...waConfig, apiUrl: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" value={waConfig.apiKey} onChange={(e) => setWaConfig({...waConfig, apiKey: e.target.value})} placeholder="kdv_live_xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input value={waConfig.phoneNumberId} onChange={(e) => setWaConfig({...waConfig, phoneNumberId: e.target.value})} placeholder="your-phone-number-id" />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <Input type="password" value={waConfig.webhookSecret} onChange={(e) => setWaConfig({...waConfig, webhookSecret: e.target.value})} placeholder="your-webhook-secret" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔗 Webhook Endpoint</CardTitle>
                <CardDescription>Configure this URL in your KirimDev dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input value={waConfig.webhookUrl || "Set after ngrok is running"} readOnly className="font-mono text-xs" />
                    <Button variant="outline" onClick={() => {
                      navigator.clipboard.writeText(waConfig.webhookUrl);
                      toast.success("Webhook URL copied!");
                    }}>Copy</Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    <Label>Update Webhook URL</Label>
                    <Input value={waConfig.webhookUrl} onChange={(e) => setWaConfig({...waConfig, webhookUrl: e.target.value})} placeholder="https://your-ngrok-url.app/api/whatsapp/webhook/..." />
                  </div>
                </div>
                <Button disabled={saving} onClick={() => handleSave("WhatsApp", "whatsapp_config", waConfig)}>
                  {saving ? "Menyimpan..." : "💾 Save WhatsApp Config to Database"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Reply Tab */}
          <TabsContent value="autoreply" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>💬 Auto-Reply Messages</CardTitle>
                <CardDescription>Configure automatic responses for different triggers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>🎉 Greeting Message</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={autoReply.greeting} onChange={(e) => setAutoReply({...autoReply, greeting: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>🌙 Outside Working Hours</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={autoReply.outsideHours} onChange={(e) => setAutoReply({...autoReply, outsideHours: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>🏖️ Holiday Message</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={autoReply.holiday} onChange={(e) => setAutoReply({...autoReply, holiday: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>⏳ Busy / Queue Message</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={autoReply.busy} onChange={(e) => setAutoReply({...autoReply, busy: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Reply Delay (ms)</Label>
                  <Input type="number" value={autoReply.delayMs} onChange={(e) => setAutoReply({...autoReply, delayMs: e.target.value})} />
                  <p className="text-xs text-muted-foreground">3000 = 3 seconds</p>
                </div>
                <Button disabled={saving} onClick={() => handleSave("Auto-Reply", "auto_reply", autoReply)}>
                  {saving ? "Menyimpan..." : "💾 Save Auto-Reply to Database"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>📨 Telegram Notifications</CardTitle>
                <CardDescription>Get notified on Telegram when important events happen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="enableTelegram" checked={notifConfig.enableTelegram} onChange={(e) => setNotifConfig({...notifConfig, enableTelegram: e.target.checked})} className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor="enableTelegram">Enable Telegram Notifications</Label>
                </div>
                <div className="space-y-2">
                  <Label>Bot Token</Label>
                  <Input type="password" value={notifConfig.telegramBotToken} onChange={(e) => setNotifConfig({...notifConfig, telegramBotToken: e.target.value})} placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" />
                </div>
                <div className="space-y-2">
                  <Label>Chat ID</Label>
                  <Input value={notifConfig.telegramChatId} onChange={(e) => setNotifConfig({...notifConfig, telegramChatId: e.target.value})} placeholder="-1001234567890" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📧 Email Notifications (SMTP)</CardTitle>
                <CardDescription>Send email alerts for escalations and reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="enableEmail" checked={notifConfig.enableEmail} onChange={(e) => setNotifConfig({...notifConfig, enableEmail: e.target.checked})} className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor="enableEmail">Enable Email Notifications</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input value={notifConfig.smtpHost} onChange={(e) => setNotifConfig({...notifConfig, smtpHost: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input value={notifConfig.smtpPort} onChange={(e) => setNotifConfig({...notifConfig, smtpPort: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP User</Label>
                    <Input value={notifConfig.smtpUser} onChange={(e) => setNotifConfig({...notifConfig, smtpUser: e.target.value})} placeholder="you@gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Password</Label>
                    <Input type="password" value={notifConfig.smtpPassword} onChange={(e) => setNotifConfig({...notifConfig, smtpPassword: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>From Address</Label>
                  <Input value={notifConfig.smtpFrom} onChange={(e) => setNotifConfig({...notifConfig, smtpFrom: e.target.value})} placeholder="AI CS Manager <noreply@example.com>" />
                </div>
                <Button disabled={saving} onClick={() => handleSave("Notifications", "notifications", notifConfig)}>
                  {saving ? "Menyimpan..." : "💾 Save Notifications to Database"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
