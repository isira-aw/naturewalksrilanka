import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { createRequest, getRequest, reviseRequest } from "@/lib/tourRequests/store";
import { requestPayloadSchema } from "@/lib/tourRequests/types";
import { travellerFromRequest } from "@/lib/tourRequests/travellerSession";

export const dynamic = "force-dynamic";

/**
 * One enquiry, for the traveller who owns it.
 *
 * Used by the wizard when amending, so it can be seeded with what was sent
 * before. Ownership is checked here rather than trusted from the URL.
 */
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "missing_reference" }, { status: 400 });

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const email = await travellerFromRequest(request);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await getRequest(reference);
  if (!existing || existing.email !== email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    reference: existing.reference,
    status: existing.status,
    payload: existing.payload,
    updatedAt: existing.updatedAt,
    revision: existing.revision,
  });
}

/**
 * Records a custom tour enquiry.
 *
 * Called from the review step just before the WhatsApp link opens. It is
 * deliberately **not** allowed to break sending: WhatsApp has been the way
 * this business receives enquiries for as long as the site has existed, and
 * a Firestore outage must not stop a traveller reaching the team. So when
 * Firebase is unconfigured this returns 200 with `saved: false`, and the
 * client carries on to WhatsApp exactly as before.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { payload, locale, reference } = (body ?? {}) as {
    payload?: unknown;
    locale?: unknown;
    reference?: unknown;
  };

  const parsed = requestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ saved: false, reason: "not_configured" });
  }

  /* An amendment, rather than a new enquiry. Only the traveller who proved
     they hold the address on the request may revise it — the reference is a
     label, not a credential. */
  if (typeof reference === "string" && reference) {
    const email = await travellerFromRequest(request);
    if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const existing = await getRequest(reference);
    if (!existing || existing.email !== email) {
      /* Same answer whether it does not exist or is not theirs: telling a
         stranger which references are real is a small gift to somebody
         enumerating them. */
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const revised = await reviseRequest(reference, parsed.data);
    if (!revised) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ saved: true, reference: revised.reference });
  }

  try {
    const created = await createRequest(
      parsed.data,
      typeof locale === "string" ? locale : "en",
    );
    return NextResponse.json({ saved: true, reference: created.reference });
  } catch (error) {
    /* Log it, but still answer 200: the traveller is one click from
       WhatsApp and an error here would strand them for a reason that is not
       theirs. The enquiry reaches the team either way. */
    console.error("Could not record tour request:", error);
    return NextResponse.json({ saved: false, reason: "write_failed" });
  }
}
