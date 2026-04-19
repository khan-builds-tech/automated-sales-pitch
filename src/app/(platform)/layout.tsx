import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ToastContainer from "@/components/Toast";
import { ToastProvider } from "@/lib/toast-context";
import { getCurrentSession } from "@/lib/auth-server";
import { UserProvider } from "@/lib/user-context";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.status !== "approved") redirect("/pending");

  const user = {
    uid: session.uid,
    email: session.email,
    name: session.name,
    role: session.role,
  };

  return (
    <UserProvider user={user}>
      <ToastProvider>
        <div className="flex min-h-screen bg-[#0a0a0a]">
          <Sidebar user={user} />
          <main className="flex-1 min-w-0">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">{children}</div>
          </main>
        </div>
        <ToastContainer />
      </ToastProvider>
    </UserProvider>
  );
}
