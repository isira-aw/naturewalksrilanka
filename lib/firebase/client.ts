"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Firebase in the browser.
 *
 * Deliberately narrow: this exists to sign people in and to upload files
 * straight to Storage. It never touches Firestore — every document read and
 * write goes through a route handler using the Admin SDK (see
 * `lib/firebase/admin.ts`), and `firestore.rules` denies client access, so a
 * `getFirestore` call from here would simply be refused.
 *
 * The values below are public by design. A Firebase web API key identifies
 * the project; it is not a secret, and security comes from Auth plus the
 * rules files, not from hiding it.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Whether the browser half is configured. Callers check this before offering
 * a Firebase-backed control, so a half-migrated deployment shows a plain
 * "unavailable" rather than throwing inside a click handler.
 */
export function isFirebaseClientConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId);
}

const APP_NAME = "naturewalk-web";

function app(): FirebaseApp | null {
  if (!isFirebaseClientConfigured()) return null;
  /* Hot reload re-runs this module; initialising the same name twice throws. */
  if (getApps().some((existing) => existing.name === APP_NAME)) return getApp(APP_NAME);
  return initializeApp(config, APP_NAME);
}

export function firebaseAuth(): Auth | null {
  const instance = app();
  return instance ? getAuth(instance) : null;
}

export function firebaseStorage(): FirebaseStorage | null {
  const instance = app();
  return instance ? getStorage(instance) : null;
}
