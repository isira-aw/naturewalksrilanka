import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { readArchive, writeArchive } from "@/lib/itineraries/blobArchive";
import { itineraryArchiveSchema, itineraryRecordSchema } from "@/lib/itineraries/types";

export const dynamic = "force-dynamic";

/** Saves (creates or updates, by id) one record. */
export async function POST(request: Request) {
  if (!requireAdmin(request)) {
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

  const next = { ...parsed.data, updatedAt: new Date().toISOString() };
  const { records } = await readArchive();
  const index = records.findIndex((existing) => existing.id === next.id);
  if (index >= 0) records[index] = next;
  else records.push(next);

  await writeArchive(records);
  return NextResponse.json(next);
}

/** Replaces or merges the whole archive — the *Data and migration* import. */
export async function PUT(request: Request) {
  if (!requireAdmin(request)) {
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

  if (mode === "merge") {
    const { records: current } = await readArchive();
    const byId = new Map(current.map((record) => [record.id, record]));
    for (const record of parsed.data.records) byId.set(record.id, record);
    const written = await writeArchive([...byId.values()]);
    return NextResponse.json(written);
  }

  const written = await writeArchive(parsed.data.records);
  return NextResponse.json(written);
}

export async function DELETE(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { records } = await readArchive();
  await writeArchive(records.filter((record) => record.id !== id));
  return NextResponse.json({ ok: true });
}
