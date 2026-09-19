import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { listComments } from "@/lib/tourRequests/comments";
import { getRequest, setRequestStatus } from "@/lib/tourRequests/store";
import { requestStatusSchema } from "@/lib/tourRequests/types";

export const dynamic = "force-dynamic";

/** One enquiry in full, with the thread on it. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { reference } = await params;

  try {
    const found = await getRequest(reference);
    if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
      request: found,
      comments: await listComments(found.reference),
    });
  } catch (error) {
    console.error(`Could not read tour request ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

/**
 * Moves an enquiry along the pipeline.
 *
 * The status is the only thing this can change. The payload is the
 * traveller's own words, and letting the panel rewrite them would destroy
 * the record of what was actually asked for. A correction belongs on the
 * thread, where both sides can see it — see `./comments`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
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

  const status = requestStatusSchema.safeParse((body as { status?: unknown })?.status);
  if (!status.success) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { reference } = await params;

  try {
    const updated = await setRequestStatus(reference, status.data);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error(`Could not update tour request ${reference}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
