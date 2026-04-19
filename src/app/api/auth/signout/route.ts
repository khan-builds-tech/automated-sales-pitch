import { buildSignOutCookieHeader } from "@/lib/session";

export async function POST() {
  const response = Response.json({ success: true });
  response.headers.set("Set-Cookie", buildSignOutCookieHeader());
  return response;
}
