import { NextResponse } from "next/server";
import {
  FIREBASE_SESSION_COOKIE,
  FIREBASE_SESSION_MAX_AGE,
  createAdminSession,
  requireAdmin,
  revokeAdminSession,
} from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";

/* Sign-in must never be answered from a cache. */
export const dynamic = "force-dynamic";

/**
 * Admin sign-in. Firebase Authentication, and nothing else.
 *
 * The browser signs in with Google, sends the resulting ID token here, and
 * gets back an httpOnly session cookie. There is no password branch and no
 * offline branch: if Firebase is unconfigured or unreachable this answers 503
 * and the panel shows the reason, rather than admitting anyone through a
 * weaker door.
 *
 * Rate limiting is Firebase's job now. It throttles sign-in attempts against
 * its own accounts, which is both stricter and more durable than the
 * in-process counter this route used to keep for the shared password.
 */

/**
 * `sameSite: "strict"` rather than `lax`: nothing outside this site should
 * ever navigate someone into an authenticated admin action, and strict costs
 * nothing here because the panel is reached by typing its address.
 */
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  };
}

/** Is the caller already signed in? The admin page asks this on load. */
export async function GET(request: Request) {
  return NextResponse.json({
    signedIn: await requireAdmin(request),
    /* So the sign-in screen can say "this deployment has no Firebase project"
       instead of letting someone press a button that cannot work. */
    available: isFirebaseConfigured(),
  });
}

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

  const result = await createAdminSession(idToken);
  if ("error" in result) {
    /* Deliberately vague to the caller: whether an address is on the staff
       list is not something an unauthenticated stranger should learn. The
       specific reason goes to the server log instead. */
    console.warn(`Admin sign-in refused: ${result.error}`);
    return NextResponse.json({ error: "not_authorised" }, { status: 403 });
  }

  const response = NextResponse.json({ signedIn: true, email: result.email });
  response.cookies.set(
    FIREBASE_SESSION_COOKIE,
    result.cookie,
    cookieOptions(FIREBASE_SESSION_MAX_AGE),
  );
  return response;
}

export async function DELETE(request: Request) {
  /* Revoke server-side first: clearing the cookie only stops *this* browser
     from presenting it, and a copy taken elsewhere would keep working. */
  await revokeAdminSession(request);

  const response = NextResponse.json({ signedIn: false });
  response.cookies.set(FIREBASE_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
