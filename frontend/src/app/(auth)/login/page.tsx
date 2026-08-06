import { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./components/login-form";
import { Bot, MessageSquare, Zap, Shield } from "lucide-react";
import logoImg from "../../../../public/logo-akuanalis.jpg";

export const metadata: Metadata = {
  title: "Login - AI Customer Service Manager",
  description: "Sign in to manage your AI WhatsApp agents",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col bg-gradient-to-br from-primary via-blue-600 to-violet-600 p-12 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]" />
        <div className="relative z-20">
          <div className="flex items-center space-x-3">
            <Image
              src={logoImg}
              alt="Akuanalis"
              width={48}
              height={48}
              className="rounded-xl shadow-lg flex-shrink-0"
              style={{ objectFit: 'cover' }}
              priority
            />
            <span className="text-xl font-bold tracking-tight">AI CS Manager</span>
          </div>
        </div>
        
        <div className="relative z-20 mt-auto space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Manage Your WhatsApp AI Agents</h2>
            <p className="text-blue-100 text-lg">
              Automate customer service, reduce response time, and scale your support with intelligent AI agents.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 rounded-lg bg-white/10 backdrop-blur p-3">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm">100K+ Messages</span>
            </div>
            <div className="flex items-center space-x-3 rounded-lg bg-white/10 backdrop-blur p-3">
              <Zap className="h-5 w-5" />
              <span className="text-sm">&lt;5s Response</span>
            </div>
            <div className="flex items-center space-x-3 rounded-lg bg-white/10 backdrop-blur p-3">
              <Bot className="h-5 w-5" />
              <span className="text-sm">Multi AI Agent</span>
            </div>
            <div className="flex items-center space-x-3 rounded-lg bg-white/10 backdrop-blur p-3">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Enterprise Security</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="mx-auto w-full max-w-[380px] space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            {/* Mobile logo */}
            <div className="flex items-center justify-center space-x-3 lg:hidden mb-4">
              <Image
                src={logoImg}
                alt="Akuanalis"
                width={40}
                height={40}
                className="rounded-xl shadow-md flex-shrink-0"
                style={{ objectFit: 'cover' }}
                priority
              />
              <span className="font-bold text-xl">AI CS Manager</span>
            </div>
            {/* Desktop logo above form */}
            <div className="hidden lg:flex justify-center mb-3">
              <Image
                src={logoImg}
                alt="Akuanalis"
                width={72}
                height={72}
                className="rounded-2xl shadow-lg"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the dashboard
            </p>
          </div>
          <LoginForm />
          <p className="text-center text-xs text-muted-foreground">
            Default: admin@example.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
