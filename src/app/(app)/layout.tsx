import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 min-w-0">{children}</main>
        {/* Copyright Footer */}
        <footer className="text-center text-xs text-slate-500 py-6 px-4 border-t border-slate-200 bg-white">
          © 2026 UniPOS. All rights reserved. Proudly made in Sri Lanka
        </footer>
      </div>
    </div>
  );
}
