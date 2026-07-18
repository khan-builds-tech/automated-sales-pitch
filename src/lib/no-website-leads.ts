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
import { Business } from "./types";

const COLLECTION = "no_website_leads";

export interface NoWebsiteLead {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string | null;
  businessPlaceId: string;
  rating: number | null;
  totalRatings: number | null;
  businessTypes: string[];
  contacted: boolean;
  called: boolean;
  converted: boolean;
  ownerEmail: string;
  ownerName: string;
  createdAt: Date;
}

export interface LeadOwner {
  email: string;
  name: string;
}

export async function saveNoWebsiteLead(business: Business, owner: LeadOwner): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    businessName: business.name,
    businessAddress: business.address,
    businessPhone: business.phone || null,
    businessPlaceId: business.place_id,
    rating: business.rating ?? null,
    totalRatings: business.total_ratings ?? null,
    businessTypes: business.types || [],
    contacted: false,
    called: false,
    converted: false,
    ownerEmail: owner.email.toLowerCase(),
    ownerName: owner.name,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateNoWebsiteLeadStatus(
  id: string,
  fields: Partial<{ contacted: boolean; called: boolean; converted: boolean }>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, fields);
}

export async function deleteNoWebsiteLead(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function deleteNoWebsiteLeads(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteNoWebsiteLead(id)));
}

function ownerConstraint(ownerEmail?: string | null): QueryConstraint[] {
  return ownerEmail ? [where("ownerEmail", "==", ownerEmail.toLowerCase())] : [];
}

export async function getNoWebsiteLeadPlaceIds(
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

export async function getNoWebsiteLeads(
  lastDoc: DocumentSnapshot | null,
  pageSize: number = 10,
  ownerEmail?: string | null
): Promise<{ leads: NoWebsiteLead[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [
    ...ownerConstraint(ownerEmail),
    orderBy("createdAt", "desc"),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));
  constraints.push(limit(pageSize));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  const leads = snapshot.docs.map(toNoWebsiteLead);
  const last = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { leads, lastDoc: last };
}

export async function getTotalNoWebsiteLeadCount(ownerEmail?: string | null): Promise<number> {
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

export async function getDistinctNoWebsiteLeadOwners(): Promise<OwnerOption[]> {
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

export async function getAllNoWebsiteLeadsForExport(
  ownerEmail?: string | null
): Promise<NoWebsiteLead[]> {
  const q = query(
    collection(db, COLLECTION),
    ...ownerConstraint(ownerEmail),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toNoWebsiteLead);
}

function toNoWebsiteLead(docSnap: DocumentSnapshot): NoWebsiteLead {
  const data = docSnap.data() as Record<string, unknown>;
  return {
    id: docSnap.id,
    businessName: (data.businessName as string) ?? "",
    businessAddress: (data.businessAddress as string) ?? "",
    businessPhone: (data.businessPhone as string | null) ?? null,
    businessPlaceId: (data.businessPlaceId as string) ?? "",
    rating: (data.rating as number | null) ?? null,
    totalRatings: (data.totalRatings as number | null) ?? null,
    businessTypes: (data.businessTypes as string[] | undefined) ?? [],
    contacted: (data.contacted as boolean) ?? false,
    called: (data.called as boolean) ?? false,
    converted: (data.converted as boolean) ?? false,
    ownerEmail: (data.ownerEmail as string) ?? "",
    ownerName: (data.ownerName as string) ?? "",
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}
