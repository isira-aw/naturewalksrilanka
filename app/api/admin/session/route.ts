import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  checkCredentials,
  issueSession,
  requireAdmin,
} from "@/lib/admin/session";

/* Sign-in must never be answered from a cache. */
export const dynamic = "force-dynamic";

/** Is the caller already signed in? The admin page asks this on load. */
export async function GET(request: Request) {
  return NextResponse.json({ signedIn: requireAdmin(request) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!checkCredentials(email, password)) {
    // Deliberately vague: which half was wrong is not the caller's business.
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ signedIn: true });
  response.cookies.set(ADMIN_COOKIE_NAME, issueSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ signedIn: false });
  response.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
