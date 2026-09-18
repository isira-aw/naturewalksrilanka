import { NextResponse } from "next/server";
import { z } from "zod";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { createRequest } from "@/lib/tourRequests/store";
import {
  documentSnapshotSchema,
  requestDownloadSchema,
  requestPayloadSchema,
} from "@/lib/tourRequests/types";

export const dynamic = "force-dynamic";

/**
 * Records a custom tour enquiry.
 *
 * Called from the review step just before the WhatsApp link opens. It is
 * deliberately **not** allowed to break sending: WhatsApp has been the way
 * this business receives enquiries for as long as the site has existed, and
 * a Firestore outage must not stop a traveller reaching the team. So when
 * Firebase is unconfigured this returns 200 with `saved: false`, and the
 * client carries on to WhatsApp exactly as before.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { payload, locale, documentSnapshot, downloads } = (body ?? {}) as {
    payload?: unknown;
    locale?: unknown;
    documentSnapshot?: unknown;
    downloads?: unknown;
  };

  const parsed = requestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  /* Both are conveniences for the team, so a malformed one is dropped rather
     than failing the enquiry. The enquiry itself is the thing that matters. */
  const snapshot = documentSnapshotSchema.safeParse(documentSnapshot);
  const savedCopies = z.array(requestDownloadSchema).max(25).safeParse(downloads);

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ saved: false, reason: "not_configured" });
  }

  try {
    const created = await createRequest(
      parsed.data,
      typeof locale === "string" ? locale : "en",
      {
        documentSnapshot: snapshot.success ? snapshot.data : undefined,
        downloads: savedCopies.success ? savedCopies.data : undefined,
      },
    );
    return NextResponse.json({ saved: true, reference: created.reference });
  } catch (error) {
    /* Log it, but still answer 200: the traveller is one click from
       WhatsApp and an error here would strand them for a reason that is not
       theirs. The enquiry reaches the team either way. */
    console.error("Could not record tour request:", error);
    return NextResponse.json({ saved: false, reason: "write_failed" });
  }
}
