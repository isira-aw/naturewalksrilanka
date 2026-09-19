import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { addComment, forTraveller, listComments } from "@/lib/tourRequests/comments";
import { getRequest } from "@/lib/tourRequests/store";
import { commentInputSchema } from "@/lib/tourRequests/types";
import { travellerFromRequest } from "@/lib/tourRequests/travellerSession";

export const dynamic = "force-dynamic";

/**
 * The thread on a trip, from the traveller's side.
 *
 * Both verbs answer the same two questions first — is somebody signed in,
 * and is this enquiry theirs — and both give the same 404 whether the
 * reference is unknown or simply not theirs, so neither can be used to find
 * out which references are real.
 *
 * Staff addresses are stripped on the way out by `forTraveller`. The
 * traveller can see that Nature Walk replied; which guide typed it is the
 * team's business.
 */
type Refusal = "unauthorized" | "not_found";

/** 401 for "prove who you are"; 404 for everything else, including "not yours". */
const STATUS: Record<Refusal, number> = { unauthorized: 401, not_found: 404 };

async function ownedBy(
  request: Request,
  reference: string,
): Promise<{ email: string; reference: string } | { error: Refusal }> {
  const email = await travellerFromRequest(request);
  if (!email) return { error: "unauthorized" };

  const existing = await getRequest(reference);
  if (!existing || existing.email !== email) return { error: "not_found" };

  return { email, reference: existing.reference };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { reference } = await params;

  try {
    const owned = await ownedBy(request, reference);
    if ("error" in owned) {
      return NextResponse.json({ error: owned.error }, { status: STATUS[owned.error] });
    }

    return NextResponse.json({ comments: forTraveller(await listComments(owned.reference)) });
  } catch (error) {
    console.error(`Could not read the thread on ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
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
    const owned = await ownedBy(request, reference);
    if ("error" in owned) {
      return NextResponse.json({ error: owned.error }, { status: STATUS[owned.error] });
    }

    const result = await addComment(owned.reference, {
      author: "traveller",
      authorEmail: owned.email,
      body: parsed.data.body,
    });
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });

    return NextResponse.json({ comment: forTraveller([result.comment])[0] }, { status: 201 });
  } catch (error) {
    console.error(`Could not add a comment to ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
