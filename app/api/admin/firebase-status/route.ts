import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { adminDb, isFirebaseConfigured, missingAdminEnv } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/* Reports live state; never cache it. */
export const dynamic = "force-dynamic";

/**
 * Is Firebase actually reachable?
 *
 * Set the environment variables and it is easy to assume the job is done —
 * but a mistyped project id, a private key that lost its newlines in transit,
 * or a service account without permissions all fail only on first use, deep
 * inside some later feature. This does the smallest possible real round trip
 * so that failure surfaces here instead.
 *
 * Admin-gated, because naming which variables are missing is a small gift to
 * anyone probing the deployment.
 */
export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.json({
      configured: false,
      reachable: false,
      missing: missingAdminEnv(),
    });
  }

  const db = adminDb();
  try {
    /* A read of one document from an empty collection: cheap, creates
       nothing, and still proves the credentials are accepted. */
    await db!.collection(COLLECTIONS.staff).limit(1).get();
    return NextResponse.json({ configured: true, reachable: true, missing: [] });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        reachable: false,
        missing: [],
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 503 },
    );
  }
}
