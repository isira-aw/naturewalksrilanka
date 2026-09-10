import { NextResponse } from "next/server";
import {
  TRAVELLER_COOKIE,
  TRAVELLER_SESSION_MAX_AGE,
  createTravellerSession,
  travellerFromRequest,
} from "@/lib/tourRequests/travellerSession";
import { isFirebaseConfigured } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/** Who, if anyone, is signed in as a traveller. */
export async function GET(request: Request) {
  return NextResponse.json({
    email: await travellerFromRequest(request),
    available: isFirebaseConfigured(),
  });
}

/** Completes an email-link sign-in by exchanging the ID token for a cookie. */
export async function POST(request: Request) {
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
    /* `lax` rather than the admin cookie's `strict`: travellers arrive here
       by clicking a link in their email, and a strict cookie would not be
       sent on that first cross-site navigation — they would land signed out
       having just signed in. There is no destructive action behind this
       cookie, so the weaker setting costs little. */
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TRAVELLER_SESSION_MAX_AGE,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ email: null });
  response.cookies.set(TRAVELLER_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
