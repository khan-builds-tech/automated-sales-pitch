import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return Response.json(
      { error: "SITE_PASSWORD not configured" },
      { status: 500 }
    );
  }

  if (password !== sitePassword) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  const response = Response.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    `site-auth=authenticated; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
  return response;
}
