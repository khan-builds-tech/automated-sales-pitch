"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Search,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const baseNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/pitches", label: "Saved Pitches", icon: FileText },
];

export interface SidebarUser {
  email: string;
  name: string;
  role: "admin" | "staff";
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const navItems =
    user.role === "admin"
      ? [...baseNavItems, { href: "/admin/users", label: "User Access", icon: ShieldCheck }]
      : baseNavItems;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#1a1a1a]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white tracking-tight whitespace-nowrap">
            SalesPitch<span className="text-[#3b82f6]">AI</span>
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#3b82f6]/10 text-[#3b82f6]"
                  : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-[#1a1a1a] space-y-2">
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-[#111]">
            <div className="text-xs text-white font-medium truncate" title={user.email}>
              {user.name || user.email}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-[#666] mt-0.5">
              {user.role}
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-50 ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>{signingOut ? "Signing out..." : "Sign out"}</span>}
        </button>
      </div>

      <div className="hidden md:block px-2 py-3 border-t border-[#1a1a1a]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer text-xs"
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} /> <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#111] border border-[#222] rounded-lg flex items-center justify-center text-white cursor-pointer"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[240px] bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-[#666] hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            {nav}
          </div>
        </div>
      )}

      <aside
        className={`hidden md:flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a] h-screen sticky top-0 transition-all duration-200 ${
          collapsed ? "w-[64px]" : "w-[240px]"
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
