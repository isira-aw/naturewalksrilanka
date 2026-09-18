import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getRequest, updateContact } from "@/lib/tourRequests/store";
import { contactUpdateSchema } from "@/lib/tourRequests/types";
import { travellerFromRequest } from "@/lib/tourRequests/travellerSession";

export const dynamic = "force-dynamic";

/**
 * A traveller correcting their own contact details.
 *
 * Two things are checked, in this order, and both matter: that somebody is
 * signed in, and that the enquiry they named is theirs. The reference is a
 * five-character label printed on a WhatsApp message — a neighbouring code is
 * easy to guess — so it says *which* trip and proves nothing about *who*.
 *
 * A reference that does not exist and one that belongs to someone else get
 * the same 404. Telling a stranger which references are real is a small gift
 * to anybody working through them.
 *
 * Only the four contact fields can change; `contactUpdateSchema` is the whole
 * list and the email is deliberately not on it.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const email = await travellerFromRequest(request);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = contactUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { reference } = await params;

  try {
    const existing = await getRequest(reference);
    if (!existing || existing.email !== email) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const updated = await updateContact(reference, parsed.data);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
      reference: updated.reference,
      payload: updated.payload,
      revision: updated.revision,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error(`Could not update contact details on ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
