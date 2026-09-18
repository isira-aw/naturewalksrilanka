import "server-only";
import { adminAuth, adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { discardProbeAccount, isRateLimited, recordRefusal } from "./signInGuard";

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
 * The `staff` allowlist decides. The `admin` custom claim must agree, and is
 * brought into line with the list when it does not: the claim exists so that
 * `requireAdmin` can answer from the session cookie without reading Firestore
 * on every request, not as a second independent authority.
 *
 * The claim alone is never enough — it could outlive somebody's employment —
 * so removal goes through the list, which also clears the claim and revokes
 * the tokens. See `/api/admin/access`.
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

  if (await isRateLimited(email)) return { error: "too_many_attempts" };

  /* The allowlist is consulted first, because it is the authorisation. A
     `staff` document can only be written by an already-authenticated admin
     (`/api/admin/access`) or by someone holding the service account — and
     anyone holding the service account could set the claim directly anyway,
     so requiring the claim as a *separate* factor buys nothing against that
     threat. What the claim is really for is speed: it rides in the session
     cookie, so `requireAdmin` answers without a Firestore read on every
     single request. Treat it as a cache of this list, kept in step below. */
  const entry = await db.collection(COLLECTIONS.staff).doc(email).get();
  if (!entry.exists) {
    await refuse(email, "not_staff", auth, decoded.uid);
    return { error: "not_staff" };
  }

  if (decoded.admin !== true) {
    /* On the allowlist but without the claim: their first sign-in since
       being added. Grant it now — otherwise a new staff member is refused
       forever, because nothing else ever sets it for an account that did
       not exist when they were added.

       They have to come back with a fresh token: this one was minted before
       the claim existed, and a session cookie built from it would not carry
       it, so every later request would read `admin !== true` and fail. The
       client asks for a new ID token and posts again — one extra round trip,
       once, on the first sign-in only. */
    await auth.setCustomUserClaims(decoded.uid, { admin: true });
    console.info(`Granted the admin claim to ${email} from the staff list.`);
    return { error: "claim_granted_retry" };
  }

  const cookie = await auth.createSessionCookie(idToken, {
    expiresIn: FIREBASE_SESSION_MAX_AGE * 1000,
  });
  return { cookie, email };
}

/**
 * Everything that happens when somebody is turned away.
 *
 * The refusal is recorded — so repeated probing is visible and rate limited —
 * and the Firebase account the sign-in popup just created is deleted, if it
 * really was created by this attempt and belongs to nobody for any other
 * reason. Without that second step the project's Authentication list fills
 * with everyone who ever found the address and pressed the button once.
 *
 * Neither step may fail the refusal: the caller is being turned away either
 * way, and an audit write that throws must not turn a 403 into a 500.
 */
async function refuse(
  email: string,
  reason: string,
  auth: ReturnType<typeof adminAuth>,
  uid: string,
) {
  await recordRefusal(email, reason);
  if (!auth) return;

  const discarded = await discardProbeAccount(auth, uid, email);
  console.warn(
    discarded
      ? `Admin sign-in refused (${reason}); the account it created was deleted.`
      : `Admin sign-in refused (${reason}); the account was kept — it predates this attempt or is in use elsewhere.`,
  );
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
