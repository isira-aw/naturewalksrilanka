import { NextResponse } from "next/server";
import { readArchive } from "@/lib/itineraries/blobArchive";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/**
 * Public read: the wizard needs this list for every visitor, not just admins.
 *
 * Hidden records are the exception. They are drafts and retired itineraries,
 * and they were previously served to anyone who asked for this URL directly.
 * The admin panel reads its list and builds its JSON export from this same
 * endpoint, though, so hidden records cannot simply be dropped — they are
 * withheld from the public and returned in full to a signed-in admin.
 */
export async function GET(request: Request) {
  const archive = await readArchive();
  if (requireAdmin(request)) return NextResponse.json(archive);

  return NextResponse.json({
    ...archive,
    records: archive.records.filter((record) => !record.hidden),
  });
}
