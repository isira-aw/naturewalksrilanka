import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { deleteRequest, getRequest } from "@/lib/tourRequests/store";
import { travellerFromRequest } from "@/lib/tourRequests/travellerSession";

export const dynamic = "force-dynamic";

/**
 * A traveller removing one of their own enquiries.
 *
 * The only destructive thing either population can do to an enquiry, and it
 * belongs to the person who sent it. There is no edit here and no edit
 * anywhere: what somebody asked for is the record a quote is built against,
 * so it is kept exactly as it was sent, or — at its author's word — not kept
 * at all. Anything that needs saying afterwards goes on the thread.
 *
 * Two checks, in this order, and both matter: that somebody is signed in,
 * and that the enquiry they named is theirs. The reference is a short label
 * printed on a WhatsApp message and a neighbouring code is easy to guess, so
 * it says *which* trip and proves nothing about *who*.
 *
 * A reference that does not exist and one belonging to somebody else get the
 * same 404. Telling a stranger which references are real is a small gift to
 * anybody working through them — and here it would be a gift attached to a
 * delete button.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const email = await travellerFromRequest(request);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { reference } = await params;

  try {
    const existing = await getRequest(reference);
    if (!existing || existing.email !== email) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    /* Ownership was just proved against this reference, so the delete is
       for the document that check read — not for whatever the caller named. */
    const deleted = await deleteRequest(existing.reference);
    if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ deleted: existing.reference });
  } catch (error) {
    console.error(`Could not delete tour request ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
