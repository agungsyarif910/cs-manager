"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import api from "@/lib/api";

type SettingsData = Record<string, any>;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [message, setMessage] = useState("");

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
    phoneNumber: "",
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get("/settings");
        if (cancelled) return;
        const settings: SettingsData = {};
        if (Array.isArray(res.data)) {
          res.data.forEach((s: any) => { settings[s.key] = s.value; });
        }
        if (settings.general) setGeneral(prev => ({ ...prev, ...settings.general }));
        if (settings.ai_config) setAiConfig(prev => ({ ...prev, ...settings.ai_config }));
        if (settings.whatsapp_config) setWaConfig(prev => ({ ...prev, ...settings.whatsapp_config }));
        if (settings.auto_reply) setAutoReply(prev => ({ ...prev, ...settings.auto_reply }));
        if (settings.notifications) setNotifConfig(prev => ({ ...prev, ...settings.notifications }));
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (section: string, key: string, data: any) => {
    setSaving(key);
    setMessage("");
    try {
      const token = localStorage.getItem('access_token') || document.cookie.match(/auth_token=([^;]*)/)?.[1] || '';
      await api.put(`/settings?key=${key}`, { value: data }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`✅ ${section} berhasil disimpan!`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      const detail = err?.response?.data?.message || err.message;
      const status = err?.response?.status || 'unknown';
      setMessage(`❌ Gagal menyimpan (${status}): ${detail}`);
    } finally {
      setSaving("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-lg">⏳ Memuat settings dari database...</div>
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "General" },
    { id: "ai", label: "AI Config" },
    { id: "whatsapp", label: "WhatsApp API" },
    { id: "autoreply", label: "Auto-Reply" },
    { id: "notifications", label: "Notifications" },
  ];

  const textareaClass = "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Kelola konfigurasi aplikasi. Semua data disimpan ke Supabase.</p>
        {message && (
          <div className="mt-2 p-3 rounded-md bg-muted text-sm font-medium">{message}</div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-48 space-y-1 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {/* General */}
          {activeTab === "general" && (
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Informasi perusahaan dan defaults.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={general.companyName} onChange={e => setGeneral({...general, companyName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input value={general.timezone} onChange={e => setGeneral({...general, timezone: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Working Hours Start</Label>
                    <Input type="time" value={general.workingHoursStart} onChange={e => setGeneral({...general, workingHoursStart: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Working Hours End</Label>
                    <Input type="time" value={general.workingHoursEnd} onChange={e => setGeneral({...general, workingHoursEnd: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Input value={general.language} onChange={e => setGeneral({...general, language: e.target.value})} />
                </div>
                <Button disabled={saving === "general"} onClick={() => handleSave("General", "general", general)}>
                  {saving === "general" ? "Menyimpan..." : "💾 Simpan ke Database"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Config */}
          {activeTab === "ai" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>🤖 AI Provider (SumoPod)</CardTitle>
                  <CardDescription>Konfigurasi koneksi AI engine.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Base URL</Label>
                    <Input value={aiConfig.apiUrl} onChange={e => setAiConfig({...aiConfig, apiUrl: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" value={aiConfig.apiKey} onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})} placeholder="sk-your-api-key" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Chat Model</Label>
                      <Input value={aiConfig.model} onChange={e => setAiConfig({...aiConfig, model: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Embedding Model</Label>
                      <Input value={aiConfig.embeddingModel} onChange={e => setAiConfig({...aiConfig, embeddingModel: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>⚙️ Model Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Temperature (0-2)</Label>
                      <Input type="number" step="0.1" min="0" max="2" value={aiConfig.temperature} onChange={e => setAiConfig({...aiConfig, temperature: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Tokens</Label>
                      <Input type="number" value={aiConfig.maxTokens} onChange={e => setAiConfig({...aiConfig, maxTokens: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Top P (0-1)</Label>
                      <Input type="number" step="0.1" min="0" max="1" value={aiConfig.topP} onChange={e => setAiConfig({...aiConfig, topP: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📝 System Prompt</CardTitle>
                  <CardDescription>System prompt sekarang dikelola melalui Prompt Builder.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <p className="text-muted-foreground mb-3">
                      Gunakan <strong>Prompt Builder</strong> untuk membangun system prompt secara visual dengan section-section terpisah (Identitas, Persona, Gaya Bahasa, dll).
                    </p>
                    <a href="/prompt-builder" className="inline-flex items-center gap-2 text-primary hover:underline font-medium">
                      🔧 Buka Prompt Builder →
                    </a>
                  </div>
                  <div className="space-y-2">
                    <Label>Preview System Prompt (read-only)</Label>
                    <textarea
                      className={textareaClass + " opacity-60"}
                      value={aiConfig.systemPrompt}
                      readOnly
                      style={{ minHeight: "80px" }}
                    />
                  </div>
                  <Button disabled={saving === "ai_config"} onClick={() => handleSave("AI Config", "ai_config", aiConfig)}>
                    {saving === "ai_config" ? "Menyimpan..." : "💾 Simpan AI Config"}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* WhatsApp API */}
          {activeTab === "whatsapp" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>📱 KirimDev WhatsApp API</CardTitle>
                  <CardDescription>Koneksi ke WhatsApp Business API.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Base URL</Label>
                    <Input value={waConfig.apiUrl} onChange={e => setWaConfig({...waConfig, apiUrl: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" value={waConfig.apiKey} onChange={e => setWaConfig({...waConfig, apiKey: e.target.value})} placeholder="kdv_live_xxxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input value={waConfig.phoneNumberId} onChange={e => setWaConfig({...waConfig, phoneNumberId: e.target.value})} placeholder="Dari KirimDev Dashboard → Device" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number (format: 628xxx)</Label>
                    <Input value={waConfig.phoneNumber || ''} onChange={e => setWaConfig({...waConfig, phoneNumber: e.target.value})} placeholder="628123456789" />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <Input type="password" value={waConfig.webhookSecret} onChange={e => setWaConfig({...waConfig, webhookSecret: e.target.value})} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🔗 Webhook URL</CardTitle>
                  <CardDescription>Pasang URL ini di KirimDev dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input value={waConfig.webhookUrl} onChange={e => setWaConfig({...waConfig, webhookUrl: e.target.value})} placeholder="https://your-ngrok.app/api/whatsapp/webhook/..." />
                  </div>
                  <Button disabled={saving === "whatsapp_config"} onClick={() => handleSave("WhatsApp", "whatsapp_config", waConfig)}>
                    {saving === "whatsapp_config" ? "Menyimpan..." : "💾 Simpan WhatsApp Config"}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Auto-Reply */}
          {activeTab === "autoreply" && (
            <Card>
              <CardHeader>
                <CardTitle>💬 Auto-Reply Messages</CardTitle>
                <CardDescription>Pesan otomatis untuk berbagai trigger.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>🎉 Greeting Message</Label>
                  <textarea className={textareaClass} value={autoReply.greeting} onChange={e => setAutoReply({...autoReply, greeting: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>🌙 Outside Working Hours</Label>
                  <textarea className={textareaClass} value={autoReply.outsideHours} onChange={e => setAutoReply({...autoReply, outsideHours: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>🏖️ Holiday Message</Label>
                  <textarea className={textareaClass} value={autoReply.holiday} onChange={e => setAutoReply({...autoReply, holiday: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>⏳ Busy Message</Label>
                  <textarea className={textareaClass} value={autoReply.busy} onChange={e => setAutoReply({...autoReply, busy: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Reply Delay (ms)</Label>
                  <Input type="number" value={autoReply.delayMs} onChange={e => setAutoReply({...autoReply, delayMs: e.target.value})} />
                  <p className="text-xs text-muted-foreground">3000 = 3 detik</p>
                </div>
                <Button disabled={saving === "auto_reply"} onClick={() => handleSave("Auto-Reply", "auto_reply", autoReply)}>
                  {saving === "auto_reply" ? "Menyimpan..." : "💾 Simpan Auto-Reply"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>📨 Telegram</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="enableTg" checked={notifConfig.enableTelegram} onChange={e => setNotifConfig({...notifConfig, enableTelegram: e.target.checked})} className="h-4 w-4" />
                    <Label htmlFor="enableTg">Enable Telegram Notifications</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Bot Token</Label>
                    <Input type="password" value={notifConfig.telegramBotToken} onChange={e => setNotifConfig({...notifConfig, telegramBotToken: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Chat ID</Label>
                    <Input value={notifConfig.telegramChatId} onChange={e => setNotifConfig({...notifConfig, telegramChatId: e.target.value})} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📧 Email (SMTP)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="enableEm" checked={notifConfig.enableEmail} onChange={e => setNotifConfig({...notifConfig, enableEmail: e.target.checked})} className="h-4 w-4" />
                    <Label htmlFor="enableEm">Enable Email Notifications</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input value={notifConfig.smtpHost} onChange={e => setNotifConfig({...notifConfig, smtpHost: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input value={notifConfig.smtpPort} onChange={e => setNotifConfig({...notifConfig, smtpPort: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP User</Label>
                      <Input value={notifConfig.smtpUser} onChange={e => setNotifConfig({...notifConfig, smtpUser: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Password</Label>
                      <Input type="password" value={notifConfig.smtpPassword} onChange={e => setNotifConfig({...notifConfig, smtpPassword: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>From Address</Label>
                    <Input value={notifConfig.smtpFrom} onChange={e => setNotifConfig({...notifConfig, smtpFrom: e.target.value})} />
                  </div>
                  <Button disabled={saving === "notifications"} onClick={() => handleSave("Notifications", "notifications", notifConfig)}>
                    {saving === "notifications" ? "Menyimpan..." : "💾 Simpan Notifications"}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
