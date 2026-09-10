import { NextResponse } from "next/server";
import { readArchive } from "@/lib/itineraries/blobArchive";

export const dynamic = "force-dynamic";

/** Public read: the wizard needs this list for every visitor, not just admins. */
export async function GET() {
  const archive = await readArchive();
  return NextResponse.json(archive);
}
