import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import {
  createUser,
  getAdminEmails,
  getUserByEmail,
} from "@/lib/users";
import { buildSessionCookieHeader, signSession } from "@/lib/session";
import { sendAccessRequestEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  let idToken: string | undefined;
  try {
    const body = await request.json();
    idToken = body.idToken;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!idToken) {
    return Response.json({ error: "Missing idToken" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error("ID token verification failed:", err);
    return Response.json({ error: "Invalid ID token" }, { status: 401 });
  }

  const email = decoded.email?.toLowerCase();
  if (!email) {
    return Response.json({ error: "No email on token" }, { status: 400 });
  }

  let user = await getUserByEmail(email);
  let isNewSignup = false;
  if (!user) {
    user = await createUser({
      uid: decoded.uid,
      email,
      name: (decoded.name as string | undefined) ?? email,
      photoUrl: (decoded.picture as string | undefined) ?? null,
    });
    isNewSignup = true;

    if (user.status === "pending") {
      const origin = request.nextUrl.origin;
      const adminEmails = getAdminEmails();
      if (adminEmails.length > 0) {
        await sendAccessRequestEmail({
          adminEmails,
          requesterEmail: user.email,
          requesterName: user.name,
          approvalUrl: `${origin}/admin/users`,
        });
      }
    }
  }

  if (user.status === "rejected") {
    return Response.json(
      { status: "rejected", error: "Access rejected. Contact an administrator." },
      { status: 403 }
    );
  }

  if (user.status === "pending") {
    return Response.json({
      status: "pending",
      isNewSignup,
      message: "Your access request is pending admin approval.",
    });
  }

  const token = signSession({
    uid: user.uid,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  });

  const response = Response.json({
    status: "approved",
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      photoUrl: user.photoUrl,
    },
  });
  response.headers.set("Set-Cookie", buildSessionCookieHeader(token));
  return response;
}
