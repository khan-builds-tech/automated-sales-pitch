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
  createdAt: Date;
}

export async function savePitch(audit: AuditResult, emailSubject: string): Promise<string> {
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
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updatePitchStatus(
  id: string,
  fields: Partial<{ emailSent: boolean; called: boolean; converted: boolean; catchupSent: boolean; recipientEmail: string }>
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

export async function getEmailSentCount(): Promise<number> {
  const q = query(collection(db, COLLECTION), where("emailSent", "==", true));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export async function getPitchedPlaceIds(placeIds: string[]): Promise<Set<string>> {
  const result = new Set<string>();
  if (placeIds.length === 0) return result;

  const chunkSize = 30;
  const chunks: string[][] = [];
  for (let i = 0; i < placeIds.length; i += chunkSize) {
    chunks.push(placeIds.slice(i, i + chunkSize));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, COLLECTION), where("businessPlaceId", "in", chunk)))
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

export async function getPitchByPlaceId(placeId: string): Promise<SavedPitch | null> {
  const q = query(
    collection(db, COLLECTION),
    where("businessPlaceId", "==", placeId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    emailSubject: data.emailSubject ?? null,
    emailSent: data.emailSent ?? false,
    called: data.called ?? false,
    converted: data.converted ?? false,
    catchupSent: data.catchupSent ?? false,
    recipientEmail: data.recipientEmail ?? null,
    createdAt: data.createdAt?.toDate() || new Date(),
  } as SavedPitch;
}

export async function getPitches(
  lastDoc: DocumentSnapshot | null,
  pageSize: number = 10
): Promise<{ pitches: SavedPitch[]; lastDoc: DocumentSnapshot | null }> {
  let q;
  if (lastDoc) {
    q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  } else {
    q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(q);
  const pitches: SavedPitch[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      emailSubject: data.emailSubject ?? null,
      emailSent: data.emailSent ?? false,
      called: data.called ?? false,
      converted: data.converted ?? false,
      catchupSent: data.catchupSent ?? false,
      recipientEmail: data.recipientEmail ?? null,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as SavedPitch;
  });

  const last = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { pitches, lastDoc: last };
}

export async function getTotalPitchCount(): Promise<number> {
  const coll = collection(db, COLLECTION);
  const snapshot = await getCountFromServer(coll);
  return snapshot.data().count;
}

export async function getAllPitchesForExport(): Promise<SavedPitch[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      emailSubject: data.emailSubject ?? null,
      emailSent: data.emailSent ?? false,
      called: data.called ?? false,
      converted: data.converted ?? false,
      catchupSent: data.catchupSent ?? false,
      recipientEmail: data.recipientEmail ?? null,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as SavedPitch;
  });
}
