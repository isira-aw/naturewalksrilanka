import { NextResponse } from "next/server";
import { adminIdentity, requireAdmin } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import {
  REVIEW_PAGE_SIZE,
  deleteReview,
  listReviewsPage,
  moderateReview,
} from "@/lib/reviews/store";
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

  const params = new URL(request.url).searchParams;
  return NextResponse.json(
    await listReviewsPage({
      status: status?.data,
      cursor: params.get("cursor") ?? undefined,
      limit: Number(params.get("limit")) || REVIEW_PAGE_SIZE,
    }),
  );
}

/**
 * Moves one review between states.
 *
 * `pending` is how something already published is taken down: it leaves the
 * site at once and comes back to the moderation queue with its photographs
 * intact, so a decision can be reconsidered rather than only reversed by
 * asking the traveller to write it again.
 */
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
  const next = reviewStatusSchema.safeParse(status);
  if (typeof id !== "string" || !next.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  /* Recorded against the decision, so "who published this" is answerable
     later without digging through logs. `requireAdmin` above already proved
     there is a signed-in staff member, so this is their address. */
  const moderator = (await adminIdentity(request)) ?? "unknown";

  const review = await moderateReview(id, next.data, moderator);
  if (!review) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ review });
}

/**
 * Removes one review for good, photographs included.
 *
 * Separate from the status changes above because it is the one decision that
 * cannot be walked back — a traveller who asks for their words to come off
 * the site is owed that, and nothing less would do it.
 */
export async function DELETE(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  if (!(await deleteReview(id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: id });
}
