/**
 * Grants a staff member access to the admin panel.
 *
 *   node --env-file=.env scripts/grant-admin.mjs someone@example.com
 *   node --env-file=.env scripts/grant-admin.mjs someone@example.com --revoke
 *
 * This is a script, not an endpoint, on purpose. An HTTP route that grants
 * administrative access is a route that can be reached, guessed at, or left
 * exposed by a later refactor; a script can only be run by someone who
 * already holds the service account key. There is no bootstrap problem to
 * solve here — whoever deploys the site can run this once.
 *
 * It does two things, because sign-in requires both: sets the `admin` custom
 * claim on the Firebase account, and adds the address to the `staff`
 * collection. The person must have signed in to Firebase at least once
 * before they have an account to grant.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const email = process.argv[2]?.trim().toLowerCase();
const revoke = process.argv.includes("--revoke");

if (!email || !email.includes("@")) {
  console.error("Usage: node --env-file=.env scripts/grant-admin.mjs <email> [--revoke]");
  process.exit(1);
}

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

let user;
try {
  user = await auth.getUserByEmail(email);
} catch {
  console.error(`No Firebase account for ${email}.`);
  console.error("Ask them to open the admin page and try Continue with Google once,");
  console.error("then run this again — signing in creates the account even when refused.");
  process.exit(1);
}

if (revoke) {
  await auth.setCustomUserClaims(user.uid, { admin: false });
  /* Invalidates any session cookie they still hold, on its next use. Without
     this they would keep access for up to eight hours. */
  await auth.revokeRefreshTokens(user.uid);
  await db.collection("staff").doc(email).delete();
  console.log(`Revoked admin access for ${email}. Existing sessions are dead.`);
  process.exit(0);
}

await auth.setCustomUserClaims(user.uid, { admin: true });
await db.collection("staff").doc(email).set(
  {
    email,
    uid: user.uid,
    displayName: user.displayName ?? null,
    grantedAt: new Date().toISOString(),
  },
  { merge: true },
);

console.log(`Granted admin access to ${email}.`);
console.log("They must sign out and back in — the claim only reaches a fresh token.");
process.exit(0);
