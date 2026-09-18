import { NextResponse } from "next/server";
import { z } from "zod";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { allowEnquiry } from "@/lib/tourRequests/rateLimit";
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
 *
 * Unauthenticated, and it has to stay that way. Three things keep it from
 * being a spam sink, none of which a traveller ever meets:
 *
 * 1. **`requestPayloadSchema` bounds every field**, so no single request can
 *    push a megabyte into Firestore.
 * 2. **A honeypot.** `company` is hidden from people by CSS and left empty by
 *    them; a bot that fills every input gives itself away. A filled honeypot
 *    gets the same answer a real enquiry gets and is quietly dropped, because
 *    telling a bot it failed only teaches it to try again. Same pattern, and
 *    the same reasoning, as `app/api/newsletter/route.ts`.
 * 3. **A rate limit**, on how many enquiries one caller may have written per
 *    hour. It drops the saved copy only — see `lib/tourRequests/rateLimit.ts`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { payload, locale, documentSnapshot, downloads, company } = (body ?? {}) as {
    payload?: unknown;
    locale?: unknown;
    documentSnapshot?: unknown;
    downloads?: unknown;
    company?: unknown;
  };

  /* The honeypot. Kept out of `payload` on purpose — the payload is what gets
     stored and read back, and a field no traveller ever fills has no business
     in a saved enquiry.

     Answered before the payload is even validated, so a bot learns nothing
     from the reply and costs nothing to turn away. `{ saved: false }` is what
     several ordinary outcomes below answer too, and is true: nothing was
     written. Inventing a reference to make it look saved would put a
     fabricated one in the reply. */
  if (typeof company === "string" && company.trim() !== "") {
    return NextResponse.json({ saved: false });
  }

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

  /* The caller is one click from WhatsApp whatever this answers — the client
     sends this without awaiting it — so 429 here costs a traveller nothing
     and says plainly in the logs that a copy was dropped rather than lost.
     `app/api/admin/session/route.ts` answers its own limit the same way. */
  if (!(await allowEnquiry(request))) {
    return NextResponse.json({ saved: false, reason: "rate_limited" }, { status: 429 });
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
