import "server-only";
import type { Auth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Keeping strangers out of the Firebase project's user list.
 *
 * The admin panel itself was never the weak point: `requireAdmin` wants a
 * Google sign-in **and** an `admin` custom claim **and** a `staff` document,
 * and a stranger gets a 403 and nothing else.
 *
 * The problem is one step earlier. `signInWithPopup` makes Firebase create
 * the user account the instant the Google consent completes — before the
 * server has looked at anything. Only then is the allowlist checked and the
 * sign-in refused. So everyone who finds the address and presses the button
 * once becomes a permanent row in the project's Authentication list, and the
 * list fills with people who were never let in.
 *
 * The right fix is a `beforeCreate` blocking function, which refuses the
 * sign-in before an account exists at all. That needs Identity Platform,
 * which needs the Blaze plan; this project is on Spark. See
 * `docs/admin-access.md`. Until then, this module does the next best thing:
 * it deletes the account in the same request that refused it, and it makes
 * the attempts visible instead of silent.
 */

/**
 * How recently an account must have been created to be treated as made by
 * the attempt now being refused.
 *
 * The window is the whole safety margin. An account older than this belongs
 * to somebody who already had a reason to exist — a traveller, a former
 * staff member, a person who signed in to the site itself — and deleting it
 * would destroy something that is not ours to destroy.
 */
const PROBE_WINDOW_MS = 5 * 60 * 1000;

/** How many refusals one address may generate before it is turned away. */
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** What the Access section shows. Newest first. */
export type RefusedAttempt = {
  email: string;
  at: string;
  reason: string;
};

function attempts() {
  return adminDb()?.collection(COLLECTIONS.adminSignInAttempts) ?? null;
}

/** Firestore document ids may not contain a slash, and emails may not either,
    but normalising keeps the key predictable for a human reading the console. */
function attemptId(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, "_").slice(0, 200);
}

/**
 * Has this address been refused too often lately?
 *
 * Firestore-backed rather than in-process. An in-memory counter used to live
 * in this codebase and was removed precisely because it does not survive
 * serverless instances: each cold start begins at zero, so the limit it
 * appears to enforce is not one.
 *
 * Fails open. A counter that cannot be read must not become a way to lock
 * the real staff out of their own panel — Firebase throttles its own sign-ins
 * underneath this anyway, so an outage here is not an open door.
 */
export async function isRateLimited(email: string): Promise<boolean> {
  const store = attempts();
  if (!store) return false;

  try {
    const doc = await store.doc(attemptId(email)).get();
    if (!doc.exists) return false;

    const data = doc.data() as { count?: number; windowStartedAt?: string } | undefined;
    const startedAt = Date.parse(data?.windowStartedAt ?? "");
    if (!Number.isFinite(startedAt)) return false;

    /* A stale window is not a breach: the count belongs to a period that has
       passed, and `recordRefusal` will start a fresh one. */
    if (Date.now() - startedAt > ATTEMPT_WINDOW_MS) return false;

    return (data?.count ?? 0) >= MAX_ATTEMPTS;
  } catch (error) {
    console.error("Could not read the admin sign-in attempt counter:", error);
    return false;
  }
}

/**
 * Notes that an address was refused, and why.
 *
 * Two jobs in one document: the counter that `isRateLimited` reads, and the
 * line the Access section shows. Somebody probing the panel should be
 * something Nandana can see, not something only a server log knows.
 */
export async function recordRefusal(email: string, reason: string): Promise<void> {
  const store = attempts();
  if (!store) return;

  const now = new Date().toISOString();
  const ref = store.doc(attemptId(email));

  try {
    const db = adminDb();
    if (!db) return;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      const data = doc.exists
        ? (doc.data() as { count?: number; windowStartedAt?: string })
        : undefined;

      const startedAt = Date.parse(data?.windowStartedAt ?? "");
      const withinWindow =
        Number.isFinite(startedAt) && Date.now() - startedAt <= ATTEMPT_WINDOW_MS;

      transaction.set(ref, {
        email: email.trim().toLowerCase(),
        reason,
        at: now,
        count: withinWindow ? (data?.count ?? 0) + 1 : 1,
        windowStartedAt: withinWindow ? data?.windowStartedAt : now,
      });
    });
  } catch (error) {
    /* Never fail a sign-in because the audit write failed. */
    console.error("Could not record an admin sign-in refusal:", error);
  }
}

/** The most recent refusals, for the Access section. */
export async function listRefusals(limit = 20): Promise<RefusedAttempt[]> {
  const store = attempts();
  if (!store) return [];

  const snapshot = await store.orderBy("at", "desc").limit(limit).get();
  return snapshot.docs.flatMap((doc) => {
    const data = doc.data() as Partial<RefusedAttempt>;
    if (!data.email || !data.at) return [];
    return [{ email: data.email, at: data.at, reason: data.reason ?? "unknown" }];
  });
}

/**
 * Deletes the Firebase account that was created by the attempt just refused.
 *
 * Every condition below exists to make sure this only ever removes an account
 * that this refusal brought into being. Anything it is not certain about, it
 * leaves alone and says so in the log — an account wrongly kept is a tidying
 * job, an account wrongly deleted is somebody's access destroyed.
 *
 * Returns whether it deleted anything, so the caller can log honestly.
 */
export async function discardProbeAccount(
  auth: Auth,
  uid: string,
  email: string,
): Promise<boolean> {
  try {
    const user = await auth.getUser(uid);

    /* One provider, and it is the one the panel's button uses. An account
       with a second provider was reached some other way, so it predates
       this attempt. */
    if (user.providerData.length !== 1 || user.providerData[0]?.providerId !== "google.com") {
      return false;
    }

    /* Created by this attempt, not merely used by it. */
    const created = Date.parse(user.metadata.creationTime ?? "");
    if (!Number.isFinite(created) || Date.now() - created > PROBE_WINDOW_MS) return false;

    /* And it is nobody's account for any other reason. A traveller who
       enquired, or subscribed, signed in with this same address through the
       public side of the site and must keep it. */
    if (await hasOtherStanding(email)) return false;

    await auth.deleteUser(uid);
    return true;
  } catch (error) {
    console.error(`Could not discard the refused account ${email}:`, error);
    return false;
  }
}

/**
 * Does this address exist on the site for some reason other than this
 * sign-in attempt?
 *
 * Errs towards yes: if any of these reads fails we cannot show the account is
 * disposable, so it is kept.
 */
async function hasOtherStanding(email: string): Promise<boolean> {
  const db = adminDb();
  if (!db) return true;

  const address = email.trim().toLowerCase();

  try {
    const [staff, subscriber, enquiries] = await Promise.all([
      db.collection(COLLECTIONS.staff).doc(address).get(),
      db.collection(COLLECTIONS.newsletterSubscribers).doc(address).get(),
      db.collection(COLLECTIONS.tourRequests).where("email", "==", address).limit(1).get(),
    ]);

    return staff.exists || subscriber.exists || !enquiries.empty;
  } catch (error) {
    console.error(`Could not check standing for ${email}; keeping the account:`, error);
    return true;
  }
}
