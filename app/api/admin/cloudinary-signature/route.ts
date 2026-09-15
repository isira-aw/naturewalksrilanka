import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { CLOUDINARY_FOLDERS, isCloudinaryConfigured, requireCloudinary } from "@/lib/cloudinary/config";
import { cloudinaryTimestamp, signedParams } from "@/lib/cloudinary/sign";

/* A signature is a credential with a clock on it; never answer from a cache. */
export const dynamic = "force-dynamic";

/**
 * Issues one short-lived signature so an admin's browser can upload an
 * itinerary photograph straight to Cloudinary.
 *
 * Direct-to-Cloudinary rather than through this function on purpose: the
 * image is a few megabytes, and pushing it through a serverless function
 * buys nothing but latency and a request-size limit to trip over.
 *
 * What keeps it safe is that this route decides *what* may be uploaded, not
 * the browser. The folder and `public_id` are built here from the itinerary
 * id, then signed; Cloudinary rejects any upload whose parameters do not
 * match the signature. So a caller who obtains a signature cannot redirect
 * the file to another folder, overwrite somebody else's image, or keep using
 * it after the timestamp ages out.
 *
 * `requireAdmin` is awaited. It is async, and a forgotten `await` returns a
 * truthy Promise — which here would hand a signing oracle to the internet.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "cloudinary_unconfigured" }, { status: 503 });
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
     choose the folder, which is the whole thing the signature is meant to
     pin down. */
  const safeId = itineraryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  const safeName = (typeof name === "string" ? name : "image")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "image";
  if (!safeId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const { cloudName } = requireCloudinary();
  const folder = CLOUDINARY_FOLDERS.itineraryImage(safeId);
  /* Unique per upload, so replacing a photograph yields a new URL that no
     CDN edge is already holding an older copy of. */
  const publicId = `${safeName}-${Date.now()}`;

  return NextResponse.json({
    cloudName,
    folder,
    publicId,
    ...signedParams({ folder, public_id: publicId, timestamp: cloudinaryTimestamp() }),
  });
}
