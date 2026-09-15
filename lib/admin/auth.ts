import "server-only";
import { adminAuth, adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Who is allowed into the admin panel.
 *
 * One mechanism, and only one: Firebase Authentication. A staff member signs
 * in with their own Google account, the server checks them against the
 * `staff` allowlist and an `admin: true` custom claim, and mints a Firebase
 * session cookie. That gives per-person accountability, instant revocation,
 * and no shared password to leak.
 *
 * There is deliberately no second door. A shared-password escape hatch used
 * to live here for the duration of the Firebase migration; it is gone. If
 * Firebase is unreachable or unconfigured, sign-in fails and says so — it
 * does not quietly fall back to something weaker, because a fallback that
 * activates exactly when the strong path is broken is the one an attacker
 * arranges to meet.
 */

export const FIREBASE_SESSION_COOKIE = "nwsl_admin_session";

/** Eight hours — a working day of editing. */
export const FIREBASE_SESSION_MAX_AGE = 60 * 60 * 8;

function cookieFromRequest(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/** The signed-in staff member's email, or `null`. Used for audit lines. */
export async function adminIdentity(request: Request): Promise<string | null> {
  const auth = adminAuth();
  const cookie = cookieFromRequest(request, FIREBASE_SESSION_COOKIE);
  if (!auth || !cookie) return null;

  try {
    /* `checkRevoked` is what makes "remove this person" take effect
       immediately: revoking their refresh tokens invalidates the cookie on
       its very next use, rather than up to eight hours later. */
    const decoded = await auth.verifySessionCookie(cookie, true);
    return decoded.admin === true ? (decoded.email ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * The single authorisation check for every `/api/admin/*` handler.
 *
 * Asynchronous, because verifying a Firebase session cookie is a real
 * operation. Every call site must `await` it — a forgotten `await` yields a
 * Promise, which is truthy, which would wave everyone through. That is the
 * one dangerous mistake available here, so grep for `requireAdmin` after any
 * change and confirm each use is awaited.
 */
export async function requireAdmin(request: Request): Promise<boolean> {
  return (await adminIdentity(request)) !== null;
}

/**
 * The same check for a server component, which has `cookies()` rather than a
 * `Request`.
 *
 * This is what keeps the admin shell out of the HTML for a stranger. The
 * route handlers are the security boundary — they always were — but there is
 * no reason to hand the panel's structure to someone who cannot use it, and
 * checking here also removes the sign-in flicker for someone who can.
 *
 * Note this runs in the Node.js runtime, as a server component. The check
 * deliberately does *not* live in `proxy.ts`: middleware runs on the edge
 * runtime, where `firebase-admin` cannot, so the best a middleware could do
 * is notice whether a cookie exists — which proves nothing about whether it
 * is valid.
 */
export async function isAdminSession(): Promise<boolean> {
  const auth = adminAuth();
  if (!auth) return false;

  const { cookies } = await import("next/headers");
  const store = await cookies();
  const cookie = store.get(FIREBASE_SESSION_COOKIE)?.value;
  if (!cookie) return false;

  try {
    const decoded = await auth.verifySessionCookie(cookie, true);
    return decoded.admin === true;
  } catch {
    return false;
  }
}

/**
 * Turns a freshly-issued Firebase ID token into a session cookie, having
 * first confirmed the holder is staff.
 *
 * Both conditions must hold: the address is on the `staff` allowlist *and*
 * the account carries the `admin` custom claim. The claim alone is not
 * enough — it is set out-of-band by a script and could outlive someone's
 * employment — and the allowlist alone is not enough, because a list entry
 * is trivially added by anyone who reaches Firestore.
 */
export async function createAdminSession(
  idToken: string,
): Promise<{ cookie: string; email: string } | { error: string }> {
  if (!isFirebaseConfigured()) return { error: "firebase_unconfigured" };

  const auth = adminAuth();
  const db = adminDb();
  if (!auth || !db) return { error: "firebase_unconfigured" };

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    return { error: "invalid_token" };
  }

  const email = decoded.email?.trim().toLowerCase();
  if (!email || decoded.email_verified !== true) {
    return { error: "unverified_email" };
  }

  if (decoded.admin !== true) return { error: "not_admin" };

  const entry = await db.collection(COLLECTIONS.staff).doc(email).get();
  if (!entry.exists) return { error: "not_staff" };

  const cookie = await auth.createSessionCookie(idToken, {
    expiresIn: FIREBASE_SESSION_MAX_AGE * 1000,
  });
  return { cookie, email };
}

/**
 * Ends the session everywhere, not just in this browser. Clearing the cookie
 * alone would leave a copied one working until it expired.
 */
export async function revokeAdminSession(request: Request) {
  const auth = adminAuth();
  const cookie = cookieFromRequest(request, FIREBASE_SESSION_COOKIE);
  if (!auth || !cookie) return;
  try {
    const decoded = await auth.verifySessionCookie(cookie, false);
    await auth.revokeRefreshTokens(decoded.sub);
  } catch {
    /* Already invalid, which is the desired end state anyway. */
  }
}
