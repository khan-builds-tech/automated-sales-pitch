import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  DocumentSnapshot,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import { AuditResult } from "./types";

const COLLECTION = "generated_pitches";

export interface SavedPitch {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string | null;
  businessWebsite: string | null;
  businessPlaceId: string;
  overallGrade: string;
  emailSubject: string | null;
  emailSent: boolean;
  called: boolean;
  converted: boolean;
  catchupSent: boolean;
  recipientEmail: string | null;
  ownerEmail: string;
  ownerName: string;
  createdAt: Date;
}

export interface PitchOwner {
  email: string;
  name: string;
}

export async function savePitch(
  audit: AuditResult,
  emailSubject: string,
  owner: PitchOwner
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    businessName: audit.business.name,
    businessAddress: audit.business.address,
    businessPhone: audit.business.phone || null,
    businessWebsite: audit.business.website || null,
    businessPlaceId: audit.business.place_id,
    overallGrade: audit.overallGrade,
    emailSubject,
    emailSent: false,
    called: false,
    converted: false,
    catchupSent: false,
    recipientEmail: null,
    ownerEmail: owner.email.toLowerCase(),
    ownerName: owner.name,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updatePitchStatus(
  id: string,
  fields: Partial<{
    emailSent: boolean;
    called: boolean;
    converted: boolean;
    catchupSent: boolean;
    recipientEmail: string;
  }>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, fields);
}

export async function deletePitch(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export async function deletePitches(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deletePitch(id)));
}

function ownerConstraint(ownerEmail?: string | null): QueryConstraint[] {
  return ownerEmail ? [where("ownerEmail", "==", ownerEmail.toLowerCase())] : [];
}

export async function getEmailSentCount(ownerEmail?: string | null): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where("emailSent", "==", true),
    ...ownerConstraint(ownerEmail)
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export async function getPitchedPlaceIds(
  placeIds: string[],
  ownerEmail?: string | null
): Promise<Set<string>> {
  const result = new Set<string>();
  if (placeIds.length === 0) return result;

  const chunkSize = 30;
  const chunks: string[][] = [];
  for (let i = 0; i < placeIds.length; i += chunkSize) {
    chunks.push(placeIds.slice(i, i + chunkSize));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocs(
        query(
          collection(db, COLLECTION),
          where("businessPlaceId", "in", chunk),
          ...ownerConstraint(ownerEmail)
        )
      )
    )
  );

  for (const snap of snapshots) {
    snap.docs.forEach((d) => {
      const placeId = d.data().businessPlaceId as string | undefined;
      if (placeId) result.add(placeId);
    });
  }
  return result;
}

export async function getPitchByPlaceId(
  placeId: string,
  ownerEmail?: string | null
): Promise<SavedPitch | null> {
  const q = query(
    collection(db, COLLECTION),
    where("businessPlaceId", "==", placeId),
    ...ownerConstraint(ownerEmail),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return toSavedPitch(docSnap);
}

export async function getPitches(
  lastDoc: DocumentSnapshot | null,
  pageSize: number = 10,
  ownerEmail?: string | null
): Promise<{ pitches: SavedPitch[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [
    ...ownerConstraint(ownerEmail),
    orderBy("createdAt", "desc"),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));
  constraints.push(limit(pageSize));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  const pitches = snapshot.docs.map(toSavedPitch);
  const last = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { pitches, lastDoc: last };
}

export async function getTotalPitchCount(ownerEmail?: string | null): Promise<number> {
  const q = ownerEmail
    ? query(collection(db, COLLECTION), ...ownerConstraint(ownerEmail))
    : collection(db, COLLECTION);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export interface OwnerOption {
  email: string;
  name: string;
}

export async function getDistinctOwners(): Promise<OwnerOption[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const map = new Map<string, OwnerOption>();
  snapshot.docs.forEach((d) => {
    const data = d.data();
    const email = (data.ownerEmail as string | undefined)?.toLowerCase();
    if (!email) return;
    if (!map.has(email)) {
      map.set(email, { email, name: (data.ownerName as string | undefined) ?? "" });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email)
  );
}

export async function getAllPitchesForExport(
  ownerEmail?: string | null
): Promise<SavedPitch[]> {
  const q = query(
    collection(db, COLLECTION),
    ...ownerConstraint(ownerEmail),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toSavedPitch);
}

function toSavedPitch(docSnap: DocumentSnapshot): SavedPitch {
  const data = docSnap.data() as Record<string, unknown>;
  return {
    id: docSnap.id,
    businessName: (data.businessName as string) ?? "",
    businessAddress: (data.businessAddress as string) ?? "",
    businessPhone: (data.businessPhone as string | null) ?? null,
    businessWebsite: (data.businessWebsite as string | null) ?? null,
    businessPlaceId: (data.businessPlaceId as string) ?? "",
    overallGrade: (data.overallGrade as string) ?? "",
    emailSubject: (data.emailSubject as string | null) ?? null,
    emailSent: (data.emailSent as boolean) ?? false,
    called: (data.called as boolean) ?? false,
    converted: (data.converted as boolean) ?? false,
    catchupSent: (data.catchupSent as boolean) ?? false,
    recipientEmail: (data.recipientEmail as string | null) ?? null,
    ownerEmail: (data.ownerEmail as string) ?? "",
    ownerName: (data.ownerName as string) ?? "",
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}
