import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
