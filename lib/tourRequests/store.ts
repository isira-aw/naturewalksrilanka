import "server-only";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  newReference,
  normaliseEmail,
  tourRequestSchema,
  type DocumentSnapshot,
  type RequestDownload,
  type RequestPayload,
  type RequestStatus,
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
 * Removes an enquiry and everything hanging off it.
 *
 * The traveller's own button, and theirs alone — a staff member cannot
 * delete somebody's enquiry from the panel, because a record the business
 * can make disappear is not a record either side can rely on. The traveller
 * asking for their data to be gone is a different thing, and is the one
 * reason anything here is destroyed.
 *
 * `recursiveDelete` rather than a plain `delete`: a deleted Firestore
 * document leaves its subcollections behind, so the thread would survive
 * the enquiry it belonged to — orphaned, unreachable, and still holding the
 * traveller's words after they asked for them to go.
 *
 * Returns whether there was anything to delete, so the caller can answer
 * 404 for a reference that never existed rather than pretending it worked.
 */
export async function deleteRequest(reference: string): Promise<boolean> {
  const { db } = requireFirebase();
  const ref = collection().doc(reference.trim().toUpperCase());

  const doc = await ref.get();
  if (!doc.exists) return false;

  await db.recursiveDelete(ref);
  return true;
}

/**
 * Every enquiry belonging to one address, newest first.
 *
 * The address comes from the session cookie at the call site, never from
 * anything the caller sent — see `/api/traveller/requests`. Needs the
 * `email` + `createdAt` composite index.
 */
export async function listRequestsForEmail(
  email: string,
  limit = 25,
): Promise<TourRequest[]> {
  const snapshot = await collection()
    .where("email", "==", normaliseEmail(email))
    .orderBy("createdAt", "desc")
    .limit(Math.min(Math.max(Math.trunc(limit) || 25, 1), 100))
    .get();

  const found: TourRequest[] = [];
  for (const doc of snapshot.docs) {
    const parsed = tourRequestSchema.safeParse(doc.data());
    if (parsed.success) found.push(parsed.data);
    else console.error(`Skipping malformed tour request ${doc.id}`);
  }
  return found;
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
 * Only the status changes. The payload is the traveller's own words, and
 * nothing — in the panel or in `/my-trip` — can rewrite them after they are
 * sent. A correction is a message on the thread, where both sides can see
 * what was asked and what was said about it afterwards.
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
