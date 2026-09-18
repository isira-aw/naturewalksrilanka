import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getRequest } from "@/lib/tourRequests/store";
import { allowUnlockAttempt } from "@/lib/tourRequests/rateLimit";
import {
  TRIP_ACCESS_MAX_AGE,
  TRIP_COOKIE,
  isReferenceAccessConfigured,
  withReference,
} from "@/lib/tourRequests/referenceAccess";
import { normaliseEmail } from "@/lib/tourRequests/types";

export const dynamic = "force-dynamic";

/**
 * Opens one trip for somebody holding its reference and the address on it.
 *
 * The weaker of the two ways in, and scoped to match: it grants that one
 * reference and never the list — see `lib/tourRequests/referenceAccess.ts`
 * for why that scoping is the whole point.
 *
 * Three rules hold this together:
 *
 * 1. **Counted before the lookup.** A caller working through the keyspace
 *    gets ten tries an hour and cannot spend unlimited Firestore reads being
 *    told no.
 * 2. **One answer for every failure.** A reference that does not exist, a
 *    reference belonging to somebody else and a mistyped address are
 *    indistinguishable, so this cannot be used to discover which references
 *    are real.
 * 3. **No secret, no feature.** Without `TRAVELLER_LINK_SECRET` the cookie
 *    could not be signed, and an unsigned one would be a way in for anybody.
 *    It reports itself unavailable instead.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured() || !isReferenceAccessConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { reference, email } = (body ?? {}) as { reference?: unknown; email?: unknown };
  if (typeof reference !== "string" || typeof email !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  /* Bounded before anything is read, and tight enough that a keyspace walk
     is not worth starting. */
  if (!(await allowUnlockAttempt(request))) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const wanted = reference.trim().toUpperCase();
  const address = normaliseEmail(email);
  if (!wanted || !address) {
    return NextResponse.json({ error: "no_match" }, { status: 403 });
  }

  let stored;
  try {
    stored = await getRequest(wanted);
  } catch (error) {
    console.error("Could not read a trip for an unlock attempt:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  /* One answer for "no such trip" and "not yours". */
  if (!stored || normaliseEmail(stored.email) !== address) {
    return NextResponse.json({ error: "no_match" }, { status: 403 });
  }

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TRIP_COOKIE}=`))
    ?.slice(TRIP_COOKIE.length + 1);

  const next = withReference(cookie, wanted);
  if (!next) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const response = NextResponse.json({ unlocked: true, reference: wanted });
  response.cookies.set(TRIP_COOKIE, next, {
    httpOnly: true,
    /* Same reasoning as the traveller session cookie: people arrive here from
       a WhatsApp thread, and nothing destructive sits behind it. */
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TRIP_ACCESS_MAX_AGE,
    path: "/",
  });
  return response;
}
