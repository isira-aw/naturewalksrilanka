import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  checkTranslationService,
  isTranslationConfigured,
  translationModel,
} from "@/lib/ai/translateItinerary";

export const dynamic = "force-dynamic";

/** What the one AI feature in this application is, and whether it works. */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    configured: isTranslationConfigured(),
    model: translationModel(),
  });
}

/**
 * Proves the key and the model against the real service.
 *
 * POST rather than GET because it makes a billable call to a third party,
 * however small — that is not something a page should do just by being
 * opened, or a browser by prefetching a link.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await checkTranslationService());
}
