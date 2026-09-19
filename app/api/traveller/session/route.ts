import { NextResponse } from "next/server";
import {
  TRAVELLER_COOKIE,
  TRAVELLER_SESSION_MAX_AGE,
  createTravellerSession,
  revokeTravellerSession,
} from "@/lib/tourRequests/travellerSession";
import { isFirebaseConfigured } from "@/lib/firebase/admin";

/* Sign-in must never be answered from a cache. */
export const dynamic = "force-dynamic";

/**
 * Traveller sign-in. Firebase Authentication, and nothing else.
 *
 * The shape of `/api/admin/session`, deliberately: the browser signs in with
 * Google, posts the ID token here, and gets back an httpOnly session cookie.
 * Two populations, two cookies, one mechanism — there is no second door on
 * either side, and no weaker fallback for a deployment where Firebase is
 * missing. It answers 503 and the page says why.
 *
 * What differs from the admin route is only what is *not* here: no allowlist
 * and no custom claim, because anyone may have sent an enquiry. Signing in
 * establishes which address somebody holds; whether that address owns a
 * particular trip is decided where the trip is read.
 *
 * There is no `GET` here. Who is signed in is decided on the server, by the
 * pages that need to know, from a cookie the browser cannot read — an
 * endpoint answering the same question to the client would be a second
 * source of truth for it, and the one that could disagree.
 */

export async function POST(request: Request) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "firebase_unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { idToken } = (body ?? {}) as { idToken?: unknown };
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const session = await createTravellerSession(idToken);
  if (!session) return NextResponse.json({ error: "not_authorised" }, { status: 403 });

  const response = NextResponse.json({ email: session.email });
  response.cookies.set(TRAVELLER_COOKIE, session.cookie, {
    httpOnly: true,
    /* `strict`, matching the admin cookie. It used to be `lax` because
       travellers arrived by clicking a link in their email and a strict
       cookie would not have been sent on that first cross-site navigation.
       There is no such link any more — everyone reaches `/my-trip` by
       following it from this site or typing it — so the weaker setting no
       longer buys anything, and there is a delete button behind this cookie
       now. */
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: TRAVELLER_SESSION_MAX_AGE,
    path: "/",
  });
  return response;
}

export async function DELETE(request: Request) {
  /* Revoke server-side first: clearing the cookie only stops *this* browser
     from presenting it, and a copy taken elsewhere would keep working. */
  await revokeTravellerSession(request);

  const response = NextResponse.json({ email: null });
  response.cookies.set(TRAVELLER_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
