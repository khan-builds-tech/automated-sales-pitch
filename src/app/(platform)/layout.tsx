"use client";

import Sidebar from "@/components/Sidebar";
import ToastContainer from "@/components/Toast";
import { ToastProvider } from "@/lib/toast-context";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
