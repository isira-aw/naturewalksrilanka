/**
 * Checks whether a Firebase account exists for an email, and whether it
 * already has admin access.
 *
 *   node --env-file=.env scripts/check-user.mjs someone@example.com
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const email = process.argv[2]?.trim().toLowerCase();

if (!email || !email.includes("@")) {
  console.error("Usage: node --env-file=.env scripts/check-user.mjs <email>");
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
  console.log(`No Firebase account for ${email}.`);
  process.exit(0);
}

console.log(`Firebase account exists for ${email} (uid: ${user.uid}).`);
console.log(`admin claim: ${user.customClaims?.admin === true ? "yes" : "no"}`);

const staffDoc = await db.collection("staff").doc(email).get();
console.log(`staff collection entry: ${staffDoc.exists ? "yes" : "no"}`);
