import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteRecord, saveRecord } from "@/lib/itineraries/store";
import { itineraryRecordSchema } from "@/lib/itineraries/types";

export const dynamic = "force-dynamic";

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
