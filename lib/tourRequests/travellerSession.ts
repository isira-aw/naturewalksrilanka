import "server-only";
import { adminAuth, isFirebaseConfigured } from "@/lib/firebase/admin";
import { normaliseEmail } from "./types";

/**
 * Who is looking at a saved trip.
 *
 * Kept entirely separate from the admin session: a different cookie, no
 * custom claim, and no access to anything but the one enquiry whose email
 * matches. A traveller proving they own an address must never be a step
 * towards the admin panel, and keeping the two cookies distinct means a bug
 * in one cannot be mistaken for authority in the other.
 *
 * The reference alone is not enough to see a trip. It is short and readable
 * on purpose — five characters from a 28-letter alphabet — so neighbouring
 * codes are guessable. Access requires a Firebase email-link sign-in as the
 * address on the enquiry.
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
  const auth = adminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifySessionCookie(cookie, true);
    /* An unverified address proves nothing. Email-link sign-in marks the
       address verified by construction, so this only excludes accounts that
       arrived some other way. */
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
 * Exchanges a freshly-completed email-link sign-in for a session cookie.
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
