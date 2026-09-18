import "server-only";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS, REVISIONS_SUBCOLLECTION } from "@/lib/firebase/collections";
import {
  documentSnapshotSchema,
  newReference,
  normaliseEmail,
  requestRevisionSchema,
  tourRequestSchema,
  type DocumentSnapshot,
  type RequestDownload,
  type RequestPayload,
  type RequestStatus,
  type RequestRevision,
  type TourRequest,
} from "./types";

/**
 * Tour requests in Firestore, keyed by their human reference.
 *
 * Using the reference as the document id keeps lookups to a single read —
 * there is no secondary index to maintain and no query to get wrong. The
 * cost is that references must be unique, which `create()` enforces for us:
 * it fails rather than overwriting, so a collision retries instead of
 * quietly destroying somebody else's enquiry.
 */

function collection() {
  const { db } = requireFirebase();
  return db.collection(COLLECTIONS.tourRequests);
}

/**
 * A ceiling on the download log. A traveller who presses the button thirty
 * times should not grow their enquiry document without limit; oldest go first.
 */
const MAX_DOWNLOADS = 25;

/**
 * Records a new enquiry and returns it.
 *
 * Retries on the astronomically unlikely reference collision rather than
 * assuming it cannot happen: 28^5 is about 17 million, which is plenty, but
 * "plenty" is not "never" and the failure mode would be one traveller
 * silently overwriting another's trip.
 */
export async function createRequest(
  payload: RequestPayload,
  locale: string,
  /**
   * What the traveller's browser knows and the server cannot work out: the
   * document it built, and which copies they saved. Both arrive with the
   * enquiry rather than in a second request — by the time one could be made
   * the traveller is already in WhatsApp, and a download usually happens
   * *before* they press send, so there is no reference to attach it to yet.
   */
  extras: { documentSnapshot?: DocumentSnapshot; downloads?: RequestDownload[] } = {},
): Promise<TourRequest> {
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const request: TourRequest = {
      reference: newReference(),
      email: normaliseEmail(payload.email),
      locale,
      status: "received",
      payload,
      createdAt: now,
      updatedAt: now,
      revision: 0,
      downloads: (extras.downloads ?? []).slice(-MAX_DOWNLOADS),
      ...(extras.documentSnapshot ? { documentSnapshot: extras.documentSnapshot } : {}),
    };

    try {
      await collection().doc(request.reference).create(request);
      return request;
    } catch (error) {
      /* `create` throws ALREADY_EXISTS (code 6) when the id is taken. Any
         other failure is a real problem and should surface. */
      if ((error as { code?: number }).code !== 6) throw error;
    }
  }

  throw new Error("Could not allocate a unique reference after five attempts.");
}

export async function getRequest(reference: string): Promise<TourRequest | null> {
  const doc = await collection().doc(reference.trim().toUpperCase()).get();
  if (!doc.exists) return null;
  const parsed = tourRequestSchema.safeParse(doc.data());
  if (!parsed.success) {
    console.error(`Malformed tour request ${doc.id}:`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

/**
 * Replaces the traveller's answers, keeping the previous version.
 *
 * The old payload is copied into a `revisions` subcollection first. The team
 * may already have quoted against what was there, so an amendment must never
 * be the only record — being able to see what changed is the whole point of
 * letting someone amend at all.
 *
 * The email is deliberately *not* updated from the new payload: it is the
 * key a returning traveller is matched against, and letting a revision
 * change it would let anyone who can reach the page hand it to someone else.
 */
export async function reviseRequest(
  reference: string,
  payload: RequestPayload,
): Promise<TourRequest | null> {
  const { db } = requireFirebase();
  const ref = collection().doc(reference.trim().toUpperCase());

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return null;

    const current = tourRequestSchema.safeParse(doc.data());
    if (!current.success) return null;

    const now = new Date().toISOString();
    const revision = current.data.revision + 1;

    transaction.set(ref.collection(REVISIONS_SUBCOLLECTION).doc(String(revision)), {
      revision: current.data.revision,
      payload: current.data.payload,
      status: current.data.status,
      supersededAt: now,
    });

    const next: TourRequest = {
      ...current.data,
      payload: { ...payload, email: current.data.email },
      updatedAt: now,
      revision,
    };

    transaction.set(ref, next);
    return next;
  });
}

/* ---- the admin side ---------------------------------------------------- */

/**
 * How many enquiries one page of the admin list holds.
 *
 * The list this replaces had no limit at all, which is why it was removed.
 * A cap and a cursor mean the page cost is the same whether the collection
 * holds fifty enquiries or fifty thousand.
 */
export const REQUEST_PAGE_SIZE = 25;

export type RequestPage = {
  requests: TourRequest[];
  /** Pass back as `cursor` for the next page; absent when there are no more. */
  nextCursor?: string;
};

/**
 * One page of enquiries, newest first, optionally narrowed to one status.
 *
 * The cursor is the last row's `createdAt` rather than an offset: an offset
 * re-reads and re-bills every document it skips, and shifts under you when a
 * new enquiry arrives mid-paging.
 *
 * Ordering by `createdAt` alone needs no declared index — Firestore indexes
 * every single field in both directions by itself. Narrowing by status does:
 * that is the `status` + `createdAt` composite in `firestore.indexes.json`.
 */
export async function listRequests({
  status,
  cursor,
  limit = REQUEST_PAGE_SIZE,
}: {
  status?: RequestStatus;
  cursor?: string;
  limit?: number;
} = {}): Promise<RequestPage> {
  /* Bounded on both sides: a caller asking for 10,000 is asking for a
     timeout and a bill, and one asking for 0 gets an empty page forever. */
  const size = Math.min(Math.max(Math.trunc(limit) || REQUEST_PAGE_SIZE, 1), 100);

  /* Built in one pass: applying `where` after an `orderBy` and then ordering
     again would order by `createdAt` twice, which Firestore rejects. */
  const base: FirebaseFirestore.Query = status
    ? collection().where("status", "==", status)
    : collection();

  let query = base.orderBy("createdAt", "desc");
  if (cursor) query = query.startAfter(cursor);

  /* One more than asked for, so "is there another page" is answered without
     a second query — and then dropped before anyone sees it. */
  const snapshot = await query.limit(size + 1).get();

  const page = snapshot.docs.slice(0, size);

  const requests: TourRequest[] = [];
  for (const doc of page) {
    const parsed = tourRequestSchema.safeParse(doc.data());
    if (parsed.success) requests.push(parsed.data);
    else console.error(`Skipping malformed tour request ${doc.id}`);
  }

  /* Taken from the last document read, not the last one successfully parsed.
     A page where everything failed to parse would otherwise produce no cursor
     and stop the listing dead, hiding every enquiry behind the bad ones. */
  const last = page[page.length - 1]?.data() as { createdAt?: unknown } | undefined;

  return {
    requests,
    nextCursor:
      snapshot.docs.length > size && typeof last?.createdAt === "string"
        ? last.createdAt
        : undefined,
  };
}

/**
 * Moves an enquiry along the pipeline.
 *
 * Only the status changes. The payload is the traveller's own words and is
 * never edited from the admin side — if it is wrong, the traveller amends it
 * through `/my-trip/<reference>` and the change is versioned. Nothing here
 * should be able to quietly rewrite what somebody asked for.
 */
export async function setRequestStatus(
  reference: string,
  status: RequestStatus,
): Promise<TourRequest | null> {
  const ref = collection().doc(reference.trim().toUpperCase());
  const doc = await ref.get();
  if (!doc.exists) return null;

  const current = tourRequestSchema.safeParse(doc.data());
  if (!current.success) return null;

  const next: TourRequest = {
    ...current.data,
    status,
    updatedAt: new Date().toISOString(),
  };
  await ref.set(next);
  return next;
}

/**
 * Every superseded version of an enquiry, oldest first.
 *
 * The team may have quoted against a version the traveller has since
 * replaced, so what changed matters as much as what it says now.
 */
export async function listRevisions(reference: string): Promise<RequestRevision[]> {
  const snapshot = await collection()
    .doc(reference.trim().toUpperCase())
    .collection(REVISIONS_SUBCOLLECTION)
    .orderBy("revision", "asc")
    .get();

  const revisions: RequestRevision[] = [];
  for (const doc of snapshot.docs) {
    const parsed = requestRevisionSchema.safeParse(doc.data());
    if (parsed.success) revisions.push(parsed.data);
    else console.error(`Skipping malformed revision ${reference}/${doc.id}`);
  }
  return revisions;
}

/* ---- what the traveller took away -------------------------------------- */

/**
 * Pins the journey document as the traveller's browser built it.
 *
 * Written once, when the enquiry is sent. A later amendment replaces it,
 * because the amended enquiry is the one the team will work from — the
 * previous document is still reachable through the payload kept in
 * `revisions`.
 *
 * Failing here must never fail the enquiry: the snapshot is a convenience
 * for the team, and the traveller is one click from WhatsApp.
 */
export async function attachDocumentSnapshot(
  reference: string,
  snapshot: DocumentSnapshot,
): Promise<void> {
  const parsed = documentSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) return;

  try {
    await collection()
      .doc(reference.trim().toUpperCase())
      .update({ documentSnapshot: parsed.data });
  } catch (error) {
    console.error(`Could not attach a document snapshot to ${reference}:`, error);
  }
}
