import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { listRequests } from "@/lib/tourRequests/store";

export const dynamic = "force-dynamic";

/**
 * The enquiry queue.
 *
 * Until now these arrived only as WhatsApp messages, so there was no list
 * to work through and nothing to attach a review invitation to. This is
 * that list.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  return NextResponse.json({ requests: await listRequests() });
}
