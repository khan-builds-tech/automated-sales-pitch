"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ShieldCheck, Clock, Ban } from "lucide-react";
import { AppUser } from "@/lib/types";
import { useCurrentUser } from "@/lib/user-context";
import { useToast } from "@/lib/toast-context";

export default function AdminUsersPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.role !== "admin") {
      router.replace("/");
    }
  }, [currentUser.role, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users as AppUser[]);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to load users", "error");
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function act(email: string, action: "approve" | "reject") {
    setPendingEmail(email);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }
      toast(
        action === "approve" ? `Approved ${email}` : `Rejected ${email}`,
        "success"
      );
      fetchUsers();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setPendingEmail(null);
    }
  }

  const grouped = useMemo(() => {
    const pending: AppUser[] = [];
    const approved: AppUser[] = [];
    const rejected: AppUser[] = [];
    for (const u of users ?? []) {
      if (u.status === "pending") pending.push(u);
      else if (u.status === "approved") approved.push(u);
      else rejected.push(u);
    }
    return { pending, approved, rejected };
  }, [users]);

  if (currentUser.role !== "admin") return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">User Access</h1>
        <p className="text-sm text-[#888] mt-1">
          Approve or reject access requests. Only approved users can sign in.
        </p>
      </div>

      {!users && <div className="text-[#888] text-sm">Loading users...</div>}

      {users && (
        <div className="space-y-8">
          <Section
            title="Pending approval"
            icon={<Clock size={16} className="text-amber-400" />}
            users={grouped.pending}
            emptyLabel="No pending requests."
            renderActions={(u) => (
              <>
                <button
                  onClick={() => act(u.email, "approve")}
                  disabled={pendingEmail === u.email}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={() => act(u.email, "reject")}
                  disabled={pendingEmail === u.email}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X size={14} /> Reject
                </button>
              </>
            )}
          />

          <Section
            title="Approved"
            icon={<ShieldCheck size={16} className="text-emerald-400" />}
            users={grouped.approved}
            emptyLabel="No approved users yet."
            renderActions={(u) =>
              u.email === currentUser.email ? (
                <span className="text-xs text-[#666]">You</span>
              ) : (
                <button
                  onClick={() => act(u.email, "reject")}
                  disabled={pendingEmail === u.email}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Ban size={14} /> Revoke
                </button>
              )
            }
          />

          <Section
            title="Rejected"
            icon={<Ban size={16} className="text-red-400" />}
            users={grouped.rejected}
            emptyLabel="No rejected users."
            renderActions={(u) => (
              <button
                onClick={() => act(u.email, "approve")}
                disabled={pendingEmail === u.email}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} /> Approve
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  users,
  emptyLabel,
  renderActions,
}: {
  title: string;
  icon: React.ReactNode;
  users: AppUser[];
  emptyLabel: string;
  renderActions: (u: AppUser) => React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-white">
          {title} <span className="text-[#666] font-normal">({users.length})</span>
        </h2>
      </div>
      {users.length === 0 ? (
        <div className="text-xs text-[#666]">{emptyLabel}</div>
      ) : (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
          {users.map((u, i) => (
            <div
              key={u.email}
              className={`flex items-center gap-4 px-4 py-3 ${
                i !== 0 ? "border-t border-[#1a1a1a]" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{u.name || u.email}</div>
                <div className="text-xs text-[#666] truncate">{u.email}</div>
              </div>
              <div className="hidden md:block text-[10px] uppercase tracking-wide text-[#666]">
                {u.role}
              </div>
              <div className="flex items-center gap-2">{renderActions(u)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
