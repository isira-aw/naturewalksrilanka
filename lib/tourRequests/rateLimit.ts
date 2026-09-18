import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * How often one caller may have an enquiry written to Firestore.
 *
 * `POST /api/custom-tour/requests` is unauthenticated by design — a traveller
 * must be able to send an enquiry without an account — and `FIELD_LIMITS`
 * bounds how *large* one request can be, but nothing bounded how *many*.
 * A loop could still fill the collection a few kilobytes at a time, and the
 * Customers section is where that lands.
 *
 * Two properties matter more here than precision:
 *
 * 1. **It must not stop a traveller reaching the team.** Sending is a
 *    WhatsApp message; the Firestore write is a copy for the team's queue.
 *    So the limit drops the copy and nothing else, and every failure path
 *    below allows the write rather than refusing it. A counter that cannot
 *    be read must not become the reason an enquiry is lost.
 * 2. **It must survive a cold start.** An in-process counter used to live in
 *    this codebase and was removed because serverless instances each begin at
 *    zero, so the limit it appeared to enforce was not one. The counter is a
 *    Firestore document, like `lib/admin/signInGuard.ts`.
 */

/** Enquiries one bucket may write per window. */
const MAX_ENQUIRIES = 8;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Attempts to open a trip with its reference, per bucket per hour.
 *
 * Tighter than the enquiry limit, because the threat is different: an
 * enquiry flood is a nuisance, whereas repeated references are somebody
 * working through a five-character keyspace. Counted before the lookup
 * rather than after a mismatch, so a caller cannot spend unlimited Firestore
 * reads being told no. Ten an hour is far more than a traveller opening
 * their own trips, mistypes included.
 */
const MAX_UNLOCK_ATTEMPTS = 10;

/**
 * How many counter documents exist, ever.
 *
 * Callers are hashed into a fixed set of buckets rather than given a document
 * each. One document per address would let anybody rotating IPs grow the
 * collection without bound — the rate limiter would become the write
 * amplifier it exists to prevent — and this project is on the Spark plan,
 * with no scheduled function to sweep up behind it. A fixed set cannot grow,
 * needs no cleanup, and is the same size after a year of abuse as it is now.
 *
 * The cost is collisions: two callers can share one allowance. With enquiry
 * volumes in the handfuls per day that is rare, and the consequence of losing
 * the draw is one enquiry's saved copy, not the enquiry.
 */
const BUCKETS = 4096;

/**
 * Which bucket a caller falls in — and nothing else about them.
 *
 * The address is hashed and reduced to a bucket number before anything is
 * stored, so no document here holds an IP address, or anything from which one
 * could be recovered. That is deliberate: this is the one part of the site
 * that sees a visitor's address, and a spam counter is not a reason to start
 * keeping personal data that the privacy policy would then have to account
 * for.
 */
function bucketOf(address: string): string {
  const digest = createHash("sha256").update(address).digest();
  return `b${digest.readUInt32BE(0) % BUCKETS}`;
}

/**
 * The caller's address, as far as it can be known.
 *
 * `x-forwarded-for` is set by Vercel's proxy and is the only source here.
 * It is a client-supplied header anywhere else, so this is a speed bump
 * against volume, not an identity check — which is all a spam counter needs
 * to be, and why nothing security-critical is decided from it.
 *
 * Returns `null` when there is no address to read, which allows the write:
 * see the note above about failing open.
 */
function callerAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  /* The list is client → proxy → proxy; the first entry is the caller. */
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  const real = request.headers.get("x-real-ip")?.trim();
  return real || null;
}

/** Counts this enquiry against the caller's allowance, and says whether to
    write it. */
export async function allowEnquiry(request: Request): Promise<boolean> {
  return consume(request, COLLECTIONS.enquiryRateLimits, MAX_ENQUIRIES);
}

/** Counts one attempt to open a trip by reference, and says whether to look
    it up at all. */
export async function allowUnlockAttempt(request: Request): Promise<boolean> {
  return consume(request, COLLECTIONS.tripUnlockAttempts, MAX_UNLOCK_ATTEMPTS);
}

/**
 * One transaction: read the bucket, decide, and write the new count.
 *
 * A read followed by a write would let a burst arriving together each read
 * the same count and all decide they were within it.
 */
async function consume(request: Request, collection: string, max: number): Promise<boolean> {
  const db = adminDb();
  if (!db) return true;

  const address = callerAddress(request);
  if (!address) return true;

  const ref = db.collection(collection).doc(bucketOf(address));

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      const data = doc.exists
        ? (doc.data() as { count?: number; windowStartedAt?: string })
        : undefined;

      const startedAt = Date.parse(data?.windowStartedAt ?? "");
      const withinWindow = Number.isFinite(startedAt) && Date.now() - startedAt <= WINDOW_MS;
      const count = withinWindow ? (data?.count ?? 0) : 0;

      if (count >= max) return false;

      const now = new Date().toISOString();
      transaction.set(ref, {
        count: count + 1,
        windowStartedAt: withinWindow ? data?.windowStartedAt : now,
        /* Only so a human reading the console can tell a live bucket from one
           left over from last month. Nothing reads it back. */
        lastAt: now,
      });
      return true;
    });
  } catch (error) {
    console.error(`Could not check the ${collection} rate limit; allowing it:`, error);
    return true;
  }
}
