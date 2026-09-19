import "server-only";
import { adminAuth, isFirebaseConfigured } from "@/lib/firebase/admin";
import { normaliseEmail } from "./types";

/**
 * Who is looking at a saved trip.
 *
 * **One way in, and it is the same one the team uses:** the traveller signs
 * in with their own Google account and the server takes the verified address
 * off the token. Whatever enquiries were sent from that address are theirs.
 *
 * There used to be three doors here — an emailed link, a password account
 * with its own registration and reset flow, and a trip unlocked by quoting
 * its reference and the address on it. Each of them had to be built,
 * explained on screen, and kept working; each was a way for somebody to be
 * lost between a form and an inbox; and the three together granted three
 * different amounts of access to the same page, which was a thing to reason
 * about every time the page changed. They are gone. Google's sign-in proves
 * the address at least as well as any of them, and there is nothing to
 * remember, nothing to email and nothing to reset.
 *
 * The session stays entirely separate from the admin one: a different
 * cookie, no custom claim, and no authority over anything but the enquiries
 * filed under that address. A traveller proving they own an address must
 * never be a step towards the panel.
 */

export const TRAVELLER_COOKIE = "nwsl_traveller";

/** A fortnight: long enough to come back and think about it, short enough. */
export const TRAVELLER_SESSION_MAX_AGE = 60 * 60 * 24 * 14;

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/** The verified email address of the current visitor, or `null`. */
export async function travellerEmail(cookie: string | undefined): Promise<string | null> {
  if (!isFirebaseConfigured() || !cookie) return null;

  try {
    /* Inside the `try`. `adminAuth()` *throws* rather than returning null
       when the Firebase variables are all present but the private key will
       not parse — gotchas §11 — and this runs in a server component, where
       a throw is a blank 500 page rather than a handled error. */
    const auth = adminAuth();
    if (!auth) return null;

    const decoded = await auth.verifySessionCookie(cookie, true);
    /* An unverified address proves nothing, and matching an enquiry is the
       only thing this session is for. Google marks the address verified by
       construction, so this excludes only accounts that arrived some other
       way. */
    if (decoded.email_verified !== true || !decoded.email) return null;
    return normaliseEmail(decoded.email);
  } catch {
    return null;
  }
}

export async function travellerFromRequest(request: Request): Promise<string | null> {
  return travellerEmail(cookieValue(request, TRAVELLER_COOKIE));
}

/** The same, for a server component. */
export async function travellerFromCookies(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return travellerEmail(store.get(TRAVELLER_COOKIE)?.value);
}

/**
 * Exchanges a freshly-completed Google sign-in for a session cookie.
 *
 * Note what is *not* checked here: whether the address has any enquiries.
 * Signing in succeeds for anyone; it only establishes which address they
 * hold. Whether that address may see a particular trip is decided at the
 * point of reading it, which keeps the check next to the data it protects.
 */
export async function createTravellerSession(
  idToken: string,
): Promise<{ cookie: string; email: string } | null> {
  const auth = adminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    if (decoded.email_verified !== true || !decoded.email) return null;
    /* A staff account must not pick up a traveller session as a side effect
       of testing the flow; keep the two populations from overlapping. */
    if (decoded.admin === true) return null;

    const cookie = await auth.createSessionCookie(idToken, {
      expiresIn: TRAVELLER_SESSION_MAX_AGE * 1000,
    });
    return { cookie, email: normaliseEmail(decoded.email) };
  } catch {
    return null;
  }
}

/**
 * Ends the session everywhere, not just in this browser.
 *
 * Clearing the cookie alone would leave a copy taken elsewhere working until
 * it expired. The admin side has done this since it was written; the
 * traveller side used only to drop the cookie, which is the weaker half of
 * signing out and the half that matters least on a shared computer.
 */
export async function revokeTravellerSession(request: Request) {
  const auth = adminAuth();
  const cookie = cookieValue(request, TRAVELLER_COOKIE);
  if (!auth || !cookie) return;
  try {
    const decoded = await auth.verifySessionCookie(cookie, false);
    await auth.revokeRefreshTokens(decoded.sub);
  } catch {
    /* Already invalid, which is the desired end state anyway. */
  }
}
