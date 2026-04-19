import { cookies } from "next/headers";
import { SESSION_COOKIE, SessionPayload, verifySession } from "./session";

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export async function requireApprovedSession(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session) throw new AuthError("Not authenticated", 401);
  if (session.status !== "approved") throw new AuthError("Not approved", 403);
  return session;
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireApprovedSession();
  if (session.role !== "admin") throw new AuthError("Admin only", 403);
  return session;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("Auth error:", err);
  return Response.json({ error: "Internal error" }, { status: 500 });
}
