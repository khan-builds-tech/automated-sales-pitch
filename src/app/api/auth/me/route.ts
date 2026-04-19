import { getCurrentSession } from "@/lib/auth-server";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json({
    authenticated: true,
    user: {
      uid: session.uid,
      email: session.email,
      name: session.name,
      role: session.role,
      status: session.status,
    },
  });
}
