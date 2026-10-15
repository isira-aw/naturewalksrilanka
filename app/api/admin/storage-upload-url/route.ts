import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { isStorageConfigured } from "@/lib/firebase/admin";
import { STORAGE_FOLDERS, signedUploadUrl } from "@/lib/firebase/storage";

/* A signed URL is a credential with a clock on it; never answer from a cache. */
export const dynamic = "force-dynamic";

/**
 * Issues one short-lived signed URL so an admin's browser can upload an
 * itinerary photograph straight to the Storage bucket.
 *
 * Direct-to-bucket rather than through this function on purpose: the image is
 * a few megabytes, and pushing it through a serverless function buys nothing
 * but latency and a request-size limit to trip over.
 *
 * What keeps it safe is that this route decides *what* may be uploaded, not
 * the browser. The object path is built here from the itinerary id, then
 * signed together with the content type; the bucket rejects a `PUT` that does
 * not match. So a caller cannot redirect the file, overwrite another image,
 * or keep using the URL after it expires.
 *
 * `requireAdmin` is awaited. It is async, and a forgotten `await` returns a
 * truthy Promise — which here would hand a signing oracle to the internet.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { itineraryId, name } = (body ?? {}) as { itineraryId?: unknown; name?: unknown };
  if (typeof itineraryId !== "string" || !itineraryId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  /* Both values land in a path, so they are rebuilt from a safe alphabet
     rather than trusted. A `..` or a slash from the client would otherwise
     choose the folder, which is the whole thing the signature pins down. */
  const safeId = itineraryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  const safeName = (typeof name === "string" ? name : "image")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "image";
  if (!safeId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  /* Unique per upload, so replacing a photograph yields a new URL that no
     cache is already holding an older copy of. */
  const path = `${STORAGE_FOLDERS.itineraryImage(safeId)}/${safeName}-${Date.now()}.jpg`;

  try {
    return NextResponse.json(await signedUploadUrl(path));
  } catch {
    return NextResponse.json({ error: "signing_failed" }, { status: 500 });
  }
}
