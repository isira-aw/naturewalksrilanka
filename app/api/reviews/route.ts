import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { submitReview } from "@/lib/reviews/store";
import { reviewSubmissionSchema } from "@/lib/reviews/types";

export const dynamic = "force-dynamic";

/**
 * Submits a review, authorised entirely by the invite token in the body.
 *
 * There is no session here: the traveller received a one-time link and that
 * is the whole of their credential. Everything the link permits is bounded
 * by what this handler will do with it — write one pending review and spend
 * the token — so a leaked link costs at most one unpublished submission.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = reviewSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await submitReview(parsed.data);
  if ("error" in result) {
    /* A spent or unknown token is the caller's problem to see; a rejected
       photograph needs to be distinguishable so the form can say which
       rule was broken. */
    const status = result.error === "invalid_token" || result.error === "token_spent" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ submitted: true });
}
