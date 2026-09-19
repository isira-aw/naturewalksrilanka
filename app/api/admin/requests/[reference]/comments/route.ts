import { NextResponse } from "next/server";
import { adminIdentity } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { addComment, listComments } from "@/lib/tourRequests/comments";
import { getRequest } from "@/lib/tourRequests/store";
import { commentInputSchema } from "@/lib/tourRequests/types";

export const dynamic = "force-dynamic";

/**
 * The same thread, from the team's side.
 *
 * Its own handler rather than a shared one with a role flag: the two sides
 * are authorised in completely different ways — the traveller's by owning
 * the address on the enquiry, the team's by being on the staff list — and a
 * single handler branching on which applies is exactly the shape in which an
 * authorisation bug hides. They share the store underneath and nothing else.
 *
 * Unlike the traveller's copy, this one keeps `authorEmail`. Knowing which
 * colleague answered is the point of an audit line.
 *
 * A staff member may add to the thread and may set the status. They cannot
 * edit the enquiry and cannot delete it; only its author can do that.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const staff = await adminIdentity(request);
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { reference } = await params;

  try {
    return NextResponse.json({ comments: await listComments(reference) });
  } catch (error) {
    console.error(`Could not read the thread on ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const staff = await adminIdentity(request);
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = commentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { reference } = await params;

  try {
    /* The enquiry is read first so a mistyped reference does not create a
       thread hanging off a document that does not exist — Firestore is
       happy to hold a subcollection under a missing parent, and nothing
       would ever read it again. */
    const existing = await getRequest(reference);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const result = await addComment(existing.reference, {
      author: "staff",
      authorEmail: staff,
      body: parsed.data.body,
    });
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });

    return NextResponse.json({ comment: result.comment }, { status: 201 });
  } catch (error) {
    console.error(`Could not add a comment to ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
