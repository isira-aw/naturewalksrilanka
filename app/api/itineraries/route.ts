import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { readArchiveEnvelope } from "@/lib/itineraries/firestoreStore";

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
  let archive;
  try {
    archive = await readArchiveEnvelope();
  } catch (error) {
    /* Firestore unreachable, out of quota, or refusing the credentials. This
       is the one Firebase read on a public page, so an unhandled throw here
       is a 500 on the custom-tour wizard for every visitor. The client store
       already renders an empty suggestions list when this call fails
       (`lib/itineraries/store.ts`), so answering deliberately — and logging
       it — degrades the page instead of breaking it. */
    console.error("Could not read the itinerary archive:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (await requireAdmin(request)) return NextResponse.json(archive);

  return NextResponse.json({
    ...archive,
    records: archive.records.filter((record) => !record.hidden),
  });
}
