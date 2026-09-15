import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

/* A sign-up is a write; never answer it from a cache. */
export const dynamic = "force-dynamic";

/**
 * Newsletter sign-ups, into Firestore like everything else.
 *
 * Two things keep this from becoming a spam sink without adding a captcha:
 *
 * 1. **The document id is the normalised email address.** Submitting twice is
 *    therefore idempotent — it overwrites one document rather than growing
 *    the collection — so a script hammering the endpoint with one address
 *    achieves nothing. It also means there is no de-duplication to do later.
 * 2. **A honeypot field.** `company` is hidden from people by CSS and left
 *    empty by them; bots that fill every input give themselves away. A filled
 *    honeypot gets the same cheerful answer as a real sign-up and is quietly
 *    dropped, because telling a bot it failed only teaches it to try again.
 *
 * Only the address, the locale and a timestamp are stored. There is nowhere
 * in this application that reads them back yet — exporting the list is a
 * console job until someone builds a screen for it.
 */

const schema = z.object({
  /* Zod's email check is deliberately the only validation. Anything stricter
     rejects real addresses; anything looser stores rubbish. */
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.string().optional(),
  /** The honeypot. Anything here means a bot filled it in. */
  company: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { email, company } = parsed.data;
  const locale =
    parsed.data.locale && hasLocale(routing.locales, parsed.data.locale)
      ? parsed.data.locale
      : routing.defaultLocale;

  /* Honeypot tripped. Answer exactly as a success would, and store nothing. */
  if (company && company.trim() !== "") {
    return NextResponse.json({ subscribed: true });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const db = adminDb();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  try {
    await db
      .collection(COLLECTIONS.newsletterSubscribers)
      /* The address as the key: one document per person, forever. */
      .doc(email)
      .set(
        {
          email,
          locale,
          subscribedAt: new Date().toISOString(),
        },
        /* Merge so re-subscribing does not wipe a field added later, and does
           not reset an unsubscribe flag if one is ever introduced. */
        { merge: true },
      );
  } catch (error) {
    console.error("Could not record a newsletter sign-up:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ subscribed: true });
}
