import { adminDb } from "./firebase-admin";
import { AppUser, UserRole, UserStatus } from "./types";

const USERS_COLLECTION = "users";

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  if (emails.length === 0) {
    console.warn(
      "ADMIN_EMAILS env var is empty — no one will be auto-approved as admin on first sign-in."
    );
  }
  return emails;
}

export function getAdminEmails(): string[] {
  return parseAdminEmails();
}

export function isBootstrapAdmin(email: string): boolean {
  return parseAdminEmails().includes(email.toLowerCase());
}

function docIdForEmail(email: string): string {
  return email.toLowerCase();
}

function serialize(raw: FirebaseFirestore.DocumentData, id: string): AppUser {
  return {
    uid: (raw.uid as string) ?? id,
    email: raw.email as string,
    name: (raw.name as string) ?? "",
    photoUrl: (raw.photoUrl as string | null) ?? null,
    role: raw.role as UserRole,
    status: raw.status as UserStatus,
    createdAt: raw.createdAt as string,
    approvedAt: (raw.approvedAt as string | null) ?? null,
    approvedBy: (raw.approvedBy as string | null) ?? null,
  };
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const snap = await adminDb().collection(USERS_COLLECTION).doc(docIdForEmail(email)).get();
  if (!snap.exists) return null;
  return serialize(snap.data()!, snap.id);
}

export async function createUser(params: {
  uid: string;
  email: string;
  name: string;
  photoUrl: string | null;
}): Promise<AppUser> {
  const email = params.email.toLowerCase();
  const isAdmin = isBootstrapAdmin(email);
  const now = new Date().toISOString();
  const user: AppUser = {
    uid: params.uid,
    email,
    name: params.name,
    photoUrl: params.photoUrl,
    role: isAdmin ? "admin" : "staff",
    status: isAdmin ? "approved" : "pending",
    createdAt: now,
    approvedAt: isAdmin ? now : null,
    approvedBy: isAdmin ? "system" : null,
  };
  await adminDb().collection(USERS_COLLECTION).doc(email).set(user);
  return user;
}

export async function setUserStatus(
  email: string,
  status: UserStatus,
  approverEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  await adminDb().collection(USERS_COLLECTION).doc(docIdForEmail(email)).update({
    status,
    approvedAt: status === "approved" ? now : null,
    approvedBy: approverEmail,
  });
}

export async function listAllUsers(): Promise<AppUser[]> {
  const snap = await adminDb()
    .collection(USERS_COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => serialize(d.data(), d.id));
}
