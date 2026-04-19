import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireAdminSession,
} from "@/lib/auth-server";
import { listAllUsers, setUserStatus } from "@/lib/users";

export async function GET() {
  try {
    await requireAdminSession();
    const users = await listAllUsers();
    return Response.json({ users });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminSession();
    const { email, action } = (await request.json()) as {
      email?: string;
      action?: "approve" | "reject";
    };
    if (!email || (action !== "approve" && action !== "reject")) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }
    await setUserStatus(
      email,
      action === "approve" ? "approved" : "rejected",
      admin.email
    );
    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
