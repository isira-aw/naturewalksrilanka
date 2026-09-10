import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteRecord, saveRecord, writeAll } from "@/lib/itineraries/repository";
import { itineraryArchiveSchema, itineraryRecordSchema } from "@/lib/itineraries/types";

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

/** Replaces or merges the whole archive — the *Data and migration* import. */
export async function PUT(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { archive, mode } = (body ?? {}) as { archive?: unknown; mode?: unknown };
  const parsed = itineraryArchiveSchema.safeParse(archive);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_archive" }, { status: 400 });
  }

  try {
    const records = await writeAll(parsed.data.records, mode === "merge" ? "merge" : "replace");
    return NextResponse.json({ schemaVersion: parsed.data.schemaVersion, records });
  } catch (error) {
    /* An oversized import is refused rather than half-applied; say so, since
       the admin panel shows this message to whoever pressed the button. */
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "import_failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await deleteRecord(id);
  return NextResponse.json({ ok: true });
}
