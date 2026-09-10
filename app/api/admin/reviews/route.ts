import { NextResponse } from "next/server";
import { adminIdentity, requireAdmin } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { listReviews, moderateReview } from "@/lib/reviews/store";
import { reviewStatusSchema } from "@/lib/reviews/types";

export const dynamic = "force-dynamic";

/** Everything awaiting a decision, or a given status. */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const requested = new URL(request.url).searchParams.get("status");
  const status = requested ? reviewStatusSchema.safeParse(requested) : null;
  if (requested && !status?.success) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  return NextResponse.json({ reviews: await listReviews(status?.data) });
}

/** Approve or reject one review. */
export async function PATCH(request: Request) {
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

  const { id, status } = (body ?? {}) as { id?: unknown; status?: unknown };
  if (typeof id !== "string" || (status !== "approved" && status !== "rejected")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  /* Recorded against the decision, so "who published this" is answerable
     later without digging through logs. Falls back to a label rather than
     failing when the legacy shared password is still in use. */
  const moderator = (await adminIdentity(request)) ?? "shared-admin";

  const review = await moderateReview(id, status, moderator);
  if (!review) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ review });
}
