import { NextResponse } from "next/server";
import { adminIdentity, requireAdmin } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getRequest } from "@/lib/tourRequests/store";
import { createInvite, invitesForReference } from "@/lib/reviews/store";

export const dynamic = "force-dynamic";

/** Invites already sent for a reference, so the panel can show the state. */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "missing_reference" }, { status: 400 });

  return NextResponse.json({ invites: await invitesForReference(reference) });
}

/**
 * Creates a review invitation for one enquiry.
 *
 * The traveller's name and email are copied from the enquiry rather than
 * accepted from the caller: the invite must belong to a real trip, and
 * letting the panel supply an arbitrary address would turn this into a way
 * to send review links to anyone.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { reference } = (body ?? {}) as { reference?: unknown };
  if (typeof reference !== "string" || !reference) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const enquiry = await getRequest(reference);
  if (!enquiry) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const invite = await createInvite(
    {
      reference: enquiry.reference,
      email: enquiry.email,
      name: enquiry.payload.name,
      locale: enquiry.locale,
    },
    (await adminIdentity(request)) ?? "shared-admin",
  );

  return NextResponse.json({ invite });
}
