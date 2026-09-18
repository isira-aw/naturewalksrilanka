/**
 * Clears out the Firebase accounts that never belonged to anybody.
 *
 *   node --env-file=.env scripts/prune-auth-users.mjs              # report only
 *   node --env-file=.env scripts/prune-auth-users.mjs --delete     # actually delete
 *
 * Why these exist at all: the admin sign-in button uses a Google popup, and
 * Firebase creates the account the moment the Google consent completes —
 * before the server has checked whether the person is staff. Everyone who
 * ever found `/admin` and pressed the button once is therefore a permanent
 * row in the project's Authentication list.
 *
 * New attempts no longer accumulate: `lib/admin/signInGuard.ts` deletes the
 * account in the same request that refuses it. This script is for the ones
 * that built up before that existed.
 *
 * It reports by default and deletes only when told to, because the cost of
 * the two mistakes is not symmetrical: an account wrongly kept is untidy, an
 * account wrongly deleted is somebody's access destroyed. Read the report
 * before passing --delete.
 *
 * An account is only ever a candidate when ALL of these hold:
 *   - it is not on the `staff` allowlist;
 *   - it does not carry the `admin` custom claim;
 *   - no `tourRequests` enquiry was sent from its address;
 *   - it is not a `newsletterSubscribers` document;
 *   - it left no review;
 *   - it has never actually signed in, or last did so long ago.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const DELETE = process.argv.includes("--delete");

/**
 * How long an account must have been idle to be considered abandoned.
 *
 * A probe account has usually never signed in successfully at all, so this
 * mostly guards against deleting somebody who is simply between visits.
 */
const IDLE_DAYS = 30;

const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"].filter(
  (name) => !process.env[name],
);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  console.error("Run with --env-file=.env, or export them first.");
  process.exit(1);
}

/* Same unwrapping as lib/firebase/admin.ts: the key arrives as one line with
   literal backslash-n, and .env files may or may not keep the quotes. */
const rawKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = (
  rawKey.startsWith('"') && rawKey.endsWith('"') ? rawKey.slice(1, -1) : rawKey
).replace(/\\n/g, "\n");

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

/* Read the whole of each small collection once rather than querying per user:
   a few hundred accounts against four collections is a lot of round trips,
   and these collections are small enough to hold in memory. */
async function addressesIn(collection, field) {
  const snapshot = await db.collection(collection).get();
  return new Set(
    snapshot.docs.flatMap((doc) => {
      const value = field ? doc.data()?.[field] : doc.id;
      return typeof value === "string" ? [value.trim().toLowerCase()] : [];
    }),
  );
}

const [staff, subscribers, enquirers, reviewers] = await Promise.all([
  addressesIn("staff"),
  addressesIn("newsletterSubscribers"),
  addressesIn("tourRequests", "email"),
  addressesIn("reviews", "email"),
]);

const idleBefore = Date.now() - IDLE_DAYS * 24 * 60 * 60 * 1000;

const candidates = [];
const kept = [];

let pageToken;
let total = 0;

do {
  const page = await auth.listUsers(1000, pageToken);
  pageToken = page.pageToken;

  for (const user of page.users) {
    total += 1;
    const email = user.email?.trim().toLowerCase();

    /* No address at all: cannot be checked against anything, so cannot be
       shown to be disposable. Left alone. */
    if (!email) {
      kept.push([user.uid, "no email address"]);
      continue;
    }

    const reason =
      (staff.has(email) && "on the staff list") ||
      (user.customClaims?.admin === true && "carries the admin claim") ||
      (enquirers.has(email) && "sent a custom tour enquiry") ||
      (subscribers.has(email) && "subscribed to the newsletter") ||
      (reviewers.has(email) && "left a review") ||
      null;

    if (reason) {
      kept.push([email, reason]);
      continue;
    }

    const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? "");
    if (Number.isFinite(lastSignIn) && lastSignIn > idleBefore) {
      kept.push([email, `signed in within the last ${IDLE_DAYS} days`]);
      continue;
    }

    candidates.push(user);
  }
} while (pageToken);

console.log(`${total} account${total === 1 ? "" : "s"} in this project.`);
console.log(`${kept.length} kept, ${candidates.length} with no reason to exist.\n`);

if (candidates.length === 0) {
  console.log("Nothing to prune.");
  process.exit(0);
}

for (const user of candidates) {
  const created = user.metadata.creationTime ?? "unknown";
  const last = user.metadata.lastSignInTime ?? "never signed in";
  console.log(`  ${user.email}  created ${created}  ${last}`);
}

if (!DELETE) {
  console.log(
    `\nNothing was deleted. Read the list above, then re-run with --delete to remove these ${candidates.length}.`,
  );
  process.exit(0);
}

/* `deleteUsers` takes at most 1000 at a time and reports per-account
   failures rather than throwing, so a single bad uid does not abandon the
   rest half-done. */
let deleted = 0;
for (let i = 0; i < candidates.length; i += 1000) {
  const batch = candidates.slice(i, i + 1000);
  const result = await auth.deleteUsers(batch.map((user) => user.uid));
  deleted += result.successCount;
  for (const failure of result.errors) {
    console.error(`  failed: ${batch[failure.index]?.email} — ${failure.error.message}`);
  }
}

console.log(`\nDeleted ${deleted} of ${candidates.length}.`);
