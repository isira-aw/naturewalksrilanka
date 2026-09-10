import "server-only";
import { adminAuth, isFirebaseConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { adminDb } from "@/lib/firebase/admin";
import { ADMIN_COOKIE_NAME, isValidSession } from "./session";

/**
 * Who is allowed into the admin panel.
 *
 * Two mechanisms live here at once, on purpose.
 *
 * **Firebase Auth** is the real one: a staff member signs in with Google or
 * an email link, the server checks them against the `staff` allowlist and an
 * `admin: true` custom claim, and mints a Firebase session cookie. That gives
 * per-person accountability, instant revocation, and no shared password.
 *
 * **The legacy shared password** from `session.ts` still works, but only
 * while Firebase is unconfigured. It is the escape hatch: this migration
 * replaces the only working way into the panel, and if the Firebase
 * credentials turn out to be wrong there would otherwise be no way in to fix
 * them. Once `/api/admin/firebase-status` is healthy and at least one staff
 * account can sign in, delete the legacy path and `lib/admin/session.ts`
 * with it — leaving a shared password alive indefinitely defeats the point.
 *
 * Note the ordering below: when Firebase *is* configured, the legacy cookie
 * is no longer accepted. The fallback is about a broken deployment, not a
 * permanent second door.
 */

export const FIREBASE_SESSION_COOKIE = "nwsl_admin_session";

/** Eight hours, matching the legacy session and a working day of editing. */
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
  if (!isFirebaseConfigured()) return null;
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
  if (isFirebaseConfigured()) {
    return (await adminIdentity(request)) !== null;
  }
  return isValidSession(cookieFromRequest(request, ADMIN_COOKIE_NAME));
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
  const { cookies } = await import("next/headers");
  const store = await cookies();

  if (isFirebaseConfigured()) {
    const auth = adminAuth();
    const cookie = store.get(FIREBASE_SESSION_COOKIE)?.value;
    if (!auth || !cookie) return false;
    try {
      const decoded = await auth.verifySessionCookie(cookie, true);
      return decoded.admin === true;
    } catch {
      return false;
    }
  }

  return isValidSession(store.get(ADMIN_COOKIE_NAME)?.value);
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
