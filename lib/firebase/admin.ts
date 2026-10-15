import "server-only";
import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Firebase on the server, via the Admin SDK.
 *
 * This is the only door to Firestore. The browser SDK is used for signing in
 * and nothing else — every document access goes through a route handler that
 * runs this code. That is why `firestore.rules` denies client access
 * outright: with no client reads or writes to allow, there are no
 * per-collection rules to get subtly wrong, and the Admin SDK bypasses rules
 * by design. Authorisation lives in the route handlers instead, where it can
 * be read in one place.
 *
 * Photographs live in the Storage bucket named by `FIREBASE_STORAGE_BUCKET`;
 * see `lib/firebase/storage.ts`.
 *
 * Nothing here throws at import time. The site has to keep building and
 * serving while the migration is only part-done, so an unconfigured
 * environment yields `null` and the callers that need Firebase say so.
 */

const PROJECT_ID = "FIREBASE_PROJECT_ID";
const CLIENT_EMAIL = "FIREBASE_CLIENT_EMAIL";
const PRIVATE_KEY = "FIREBASE_PRIVATE_KEY";

/**
 * Whether the code is running on Cloud Run, which is what Firebase App Hosting
 * deploys to (`K_SERVICE` is set by the platform, never by us). There the
 * runtime service account supplies credentials on its own, so no key is needed.
 */
function runsOnGoogleCloud(): boolean {
  return Boolean(process.env.K_SERVICE);
}

/** An explicit service-account key was supplied; it always wins over ambient credentials. */
function hasServiceAccountKey(): boolean {
  return Boolean(process.env[CLIENT_EMAIL] && process.env[PRIVATE_KEY]);
}

/**
 * Which of the required variables are missing, if any.
 *
 * Locally, and anywhere off Google Cloud, all three are required: that is the
 * service-account key. On App Hosting only the project id is, because the
 * platform's own identity is used instead of a key sitting in the environment.
 */
export function missingAdminEnv(): string[] {
  const required =
    runsOnGoogleCloud() && !hasServiceAccountKey()
      ? [PROJECT_ID]
      : [PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY];
  return required.filter((name) => !process.env[name]);
}

export function isFirebaseConfigured(): boolean {
  return missingAdminEnv().length === 0;
}

/**
 * A service-account private key survives an environment variable as a single
 * line with literal backslash-n in it. Hosting dashboards and .env files differ
 * over whether the value keeps its surrounding quotes, so both are handled.
 */
function privateKey(): string {
  const raw = process.env[PRIVATE_KEY] ?? "";
  const unquoted = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  return unquoted.replace(/\\n/g, "\n");
}

const APP_NAME = "naturewalk-admin";

/**
 * The initialised app, or `null` when the environment is incomplete.
 *
 * `getApps()` is checked rather than a module-level flag because Next.js
 * re-evaluates modules on hot reload, and initialising twice under the same
 * name throws.
 */
function app(): App | null {
  if (!isFirebaseConfigured()) return null;
  if (getApps().some((existing) => existing.name === APP_NAME)) return getApp(APP_NAME);

  return initializeApp(
    {
      projectId: process.env[PROJECT_ID],
      credential: hasServiceAccountKey()
        ? cert({
            projectId: process.env[PROJECT_ID],
            clientEmail: process.env[CLIENT_EMAIL],
            privateKey: privateKey(),
          })
        : applicationDefault(),
    },
    APP_NAME,
  );
}

export function adminAuth() {
  const instance = app();
  return instance ? getAuth(instance) : null;
}

export function adminDb() {
  const instance = app();
  return instance ? getFirestore(instance) : null;
}

const STORAGE_BUCKET = "FIREBASE_STORAGE_BUCKET";

/** Whether the bucket name is set. Reported separately: the rest of Firebase works without it. */
export function isStorageConfigured(): boolean {
  return isFirebaseConfigured() && Boolean(process.env[STORAGE_BUCKET]);
}

export function missingStorageEnv(): string[] {
  return [...missingAdminEnv(), STORAGE_BUCKET].filter((name) => !process.env[name]);
}

/** The photograph bucket, or `null` when Firebase or the bucket name is unset. */
export function adminBucket() {
  const instance = app();
  const name = process.env[STORAGE_BUCKET];
  return instance && name ? getStorage(instance).bucket(name) : null;
}

/**
 * The same two accessors for code that cannot carry on without Firebase — a
 * route handler that exists only to read Firestore, say. Throws with a
 * message naming the missing variables rather than failing later on a null.
 */
export function requireFirebase() {
  const auth = adminAuth();
  const db = adminDb();
  if (!auth || !db) {
    throw new Error(`Firebase is not configured: ${missingAdminEnv().join(", ")} not set.`);
  }
  return { auth, db };
}
