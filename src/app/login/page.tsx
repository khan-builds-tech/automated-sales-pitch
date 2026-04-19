"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleGoogleSignIn() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (res.ok && data.status === "approved") {
        router.push("/");
        router.refresh();
        return;
      }

      // Not approved — sign out of Firebase so we don't keep a stale client session
      await signOut(auth);

      if (data.status === "pending") {
        router.push("/pending");
        return;
      }

      setError(
        data.error ||
          (data.status === "rejected"
            ? "Your access was rejected. Please contact an administrator."
            : "Unable to sign in.")
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Google sign-in failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            SalesPitch<span className="text-blue-400">AI</span>
          </span>
        </div>

        <p className="text-sm text-[#888] text-center mb-6">
          Sign in with your Google account to continue.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#f4f4f4] text-[#111] font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        {error && <p className="text-sm text-[#ef4444] mt-4 text-center">{error}</p>}
        {info && <p className="text-sm text-[#888] mt-4 text-center">{info}</p>}

        <p className="text-xs text-[#555] mt-6 text-center">
          First-time sign-ins require admin approval before access is granted.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8595-3.0477.8595-2.3441 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9827 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9963 8.9963 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0173.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  );
}
