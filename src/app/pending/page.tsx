"use client";

import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-8 w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            SalesPitch<span className="text-blue-400">AI</span>
          </span>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-[#1a1a2e] flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <h1 className="text-lg font-semibold text-white mb-2">
          Awaiting approval
        </h1>
        <p className="text-sm text-[#888] mb-6">
          Your access request has been sent to the admins. You&apos;ll be able to
          sign in once an admin approves it.
        </p>

        <Link
          href="/login"
          className="inline-block w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-3 rounded-lg transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
