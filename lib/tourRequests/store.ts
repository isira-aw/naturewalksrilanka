import "server-only";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS, REVISIONS_SUBCOLLECTION } from "@/lib/firebase/collections";
import {
  newReference,
  normaliseEmail,
  tourRequestSchema,
  type RequestPayload,
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

/** The admin queue: newest first. */
export async function listRequests(limit = 100): Promise<TourRequest[]> {
  const snapshot = await collection().orderBy("createdAt", "desc").limit(limit).get();

  const requests: TourRequest[] = [];
  for (const doc of snapshot.docs) {
    const parsed = tourRequestSchema.safeParse(doc.data());
    if (parsed.success) requests.push(parsed.data);
    else console.error(`Skipping malformed tour request ${doc.id}`);
  }
  return requests;
}
