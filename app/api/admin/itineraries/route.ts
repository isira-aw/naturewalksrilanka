import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  ITINERARY_PAGE_SIZE,
  deleteRecord,
  getRecord,
  listRecordsPage,
  saveRecord,
} from "@/lib/itineraries/store";
import { itineraryRecordSchema } from "@/lib/itineraries/types";

export const dynamic = "force-dynamic";

/**
 * The admin list, a page at a time — or one record in full.
 *
 * Separate from the public `GET /api/itineraries`, which the wizard uses and
 * which must keep returning every visible itinerary so it can filter them by
 * category. This one answers with summaries: the list shows a title, a
 * category and some status dots, and has no use for two content blocks and
 * four inline translations per row.
 *
 * `?id=` returns the full record, which is what the editor opens.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const id = params.get("id");

  try {
    if (id) {
      const record = await getRecord(id);
      if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ record });
    }

    return NextResponse.json(
      await listRecordsPage({
        cursor: params.get("cursor") ?? undefined,
        limit: Number(params.get("limit")) || ITINERARY_PAGE_SIZE,
      }),
    );
  } catch (error) {
    console.error("Could not read itineraries:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

/** Saves (creates or updates, by id) one record. */
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = itineraryRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  return NextResponse.json(await saveRecord(parsed.data));
}

/** Removes one itinerary for good. */
export async function DELETE(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await deleteRecord(id);
  return NextResponse.json({ ok: true });
}
