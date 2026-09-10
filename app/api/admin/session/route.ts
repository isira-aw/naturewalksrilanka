import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  checkCredentials,
  issueSession,
} from "@/lib/admin/session";
import {
  FIREBASE_SESSION_COOKIE,
  FIREBASE_SESSION_MAX_AGE,
  createAdminSession,
  requireAdmin,
  revokeAdminSession,
} from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import {
  allowAttempt,
  clientKey,
  resetAttempts,
  retryAfterSeconds,
} from "@/lib/admin/rateLimit";

/* Sign-in must never be answered from a cache. */
export const dynamic = "force-dynamic";

/**
 * Cookie settings shared by both sign-in paths.
 *
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
    /* Tells the sign-in form which method to offer, so a half-configured
       deployment shows the one that actually works. */
    method: isFirebaseConfigured() ? "firebase" : "password",
  });
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (!allowAttempt(key)) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { idToken, email, password } = (body ?? {}) as {
    idToken?: unknown;
    email?: unknown;
    password?: unknown;
  };

  /* Firebase path. Once Firebase is configured this is the only way in — the
     password branch below stops being reachable, by design. */
  if (isFirebaseConfigured()) {
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

    resetAttempts(key);
    const response = NextResponse.json({ signedIn: true, email: result.email });
    response.cookies.set(
      FIREBASE_SESSION_COOKIE,
      result.cookie,
      cookieOptions(FIREBASE_SESSION_MAX_AGE),
    );
    return response;
  }

  /* Legacy shared password — the escape hatch while Firebase is unconfigured.
     Delete this branch, and `lib/admin/session.ts`, once staff accounts work. */
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!checkCredentials(email, password)) {
    // Deliberately vague: which half was wrong is not the caller's business.
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  resetAttempts(key);

  const response = NextResponse.json({ signedIn: true });
  response.cookies.set(
    ADMIN_COOKIE_NAME,
    issueSession(),
    cookieOptions(ADMIN_SESSION_MAX_AGE),
  );
  return response;
}

export async function DELETE(request: Request) {
  /* Revoke server-side first: clearing the cookie only stops *this* browser
     from presenting it, and a copy taken elsewhere would keep working. */
  await revokeAdminSession(request);

  const response = NextResponse.json({ signedIn: false });
  response.cookies.set(FIREBASE_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
