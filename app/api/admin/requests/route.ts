import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { listRequests, REQUEST_PAGE_SIZE } from "@/lib/tourRequests/store";
import { requestStatusSchema } from "@/lib/tourRequests/types";

export const dynamic = "force-dynamic";

/**
 * One page of custom tour enquiries, for the Customers section.
 *
 * This endpoint existed before and was deleted along with the old Enquiries
 * queue. It comes back deliberately bounded: the version that was removed
 * read the whole collection on every load, which was fine at fifty enquiries
 * and a timeout at fifty thousand. A page size and a cursor make the cost
 * constant.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const params = new URL(request.url).searchParams;

  /* An unrecognised status is a bug in the caller, not a reason to silently
     return everything — that would look like the filter had been applied. */
  const rawStatus = params.get("status");
  const status = rawStatus ? requestStatusSchema.safeParse(rawStatus) : undefined;
  if (status && !status.success) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const page = await listRequests({
      status: status?.data,
      cursor: params.get("cursor") ?? undefined,
      limit: Number(params.get("limit")) || REQUEST_PAGE_SIZE,
    });
    return NextResponse.json(page);
  } catch (error) {
    console.error("Could not list tour requests:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
