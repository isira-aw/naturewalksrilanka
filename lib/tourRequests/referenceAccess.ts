import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Opening one trip with its reference and the address on it, and no email.
 *
 * The email link proves who somebody is. This proves less: that they hold
 * two things printed in their own WhatsApp thread. It exists because the
 * link has a real cost — it has to arrive, it has to be opened on a device
 * the traveller is holding, and every one of those steps is somewhere the
 * traveller can be lost.
 *
 * **So the access it grants is deliberately smaller.** A reference is five
 * readable characters and a neighbouring code is guessable, which is why the
 * reference has never been a credential on its own. Pairing it with the
 * address raises the cost of a guess, but not to the level of proving the
 * address is yours — so a session made this way opens **only the reference
 * it was made for**. It never lists a traveller's other trips, because
 * guessing one reference must not turn into reading everything filed under
 * that address. `/my-trip` therefore ignores this cookie entirely; only
 * `/my-trip/<reference>` honours it, and only for that reference.
 *
 * The signature is the whole security of the cookie, so an unset secret
 * turns the feature off rather than falling back to something weaker.
 */

export const TRIP_COOKIE = "nwsl_trip";

/** A week. Long enough to come back to a quote, short enough to lapse. */
export const TRIP_ACCESS_MAX_AGE = 60 * 60 * 24 * 7;

/** More than one trip may be open at once, but not an unbounded list. */
const MAX_REFERENCES = 10;

function secret(): string | null {
  const value = process.env.TRAVELLER_LINK_SECRET?.trim();
  /* Short secrets are worse than none, because they invite the belief that
     something is signed when it is barely signed. */
  return value && value.length >= 32 ? value : null;
}

/** Whether this deployment can offer reference access at all. */
export function isReferenceAccessConfigured(): boolean {
  return secret() !== null;
}

type Payload = { refs: string[]; exp: number };

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

/** Constant-time compare, and never throwing on a malformed input. */
function signatureMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** The cookie value granting access to exactly these references. */
export function encodeTripAccess(references: string[]): string | null {
  const key = secret();
  if (!key) return null;

  const payload: Payload = {
    refs: references.slice(-MAX_REFERENCES),
    exp: Date.now() + TRIP_ACCESS_MAX_AGE * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

/**
 * The references a cookie actually entitles its holder to.
 *
 * Every failure — no secret, no cookie, a bad shape, a broken signature, an
 * expired payload — returns an empty list. There is no path here that grants
 * anything on a cookie it could not verify.
 */
export function decodeTripAccess(cookie: string | undefined): string[] {
  const key = secret();
  if (!key || !cookie) return [];

  const [body, signature] = cookie.split(".");
  if (!body || !signature) return [];
  if (!signatureMatches(sign(body, key), signature)) return [];

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<Payload>;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return [];
    if (!Array.isArray(payload.refs)) return [];
    return payload.refs.filter((ref): ref is string => typeof ref === "string");
  } catch {
    return [];
  }
}

/** Does this cookie open this one trip? */
export function cookieOpensReference(cookie: string | undefined, reference: string): boolean {
  return decodeTripAccess(cookie).includes(reference.trim().toUpperCase());
}

/** The same question, from a server component. */
export async function referenceOpenFromCookies(reference: string): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return cookieOpensReference(store.get(TRIP_COOKIE)?.value, reference);
}

/** Adds one reference to whatever the visitor already had open. */
export function withReference(cookie: string | undefined, reference: string): string | null {
  const current = decodeTripAccess(cookie);
  const next = current.includes(reference) ? current : [...current, reference];
  return encodeTripAccess(next);
}
