import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/admin/session";
import { translatableSchema } from "@/lib/itineraries/types";
import { translateItinerary } from "@/lib/ai/translateItinerary";

export const dynamic = "force-dynamic";

/**
 * Translates one itinerary into one locale. One locale per request on purpose:
 * Gemini can be up for one call and down for the next, so the admin page fires
 * these one at a time and records the outcome per locale, leaving only the
 * ones that actually failed to retry.
 */
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

  const { locale, fields } = (body ?? {}) as { locale?: unknown; fields?: unknown };
  if (typeof locale !== "string" || !hasLocale(routing.locales, locale) || locale === "en") {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }

  const parsed = translatableSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const outcome = await translateItinerary(parsed.data, locale as Locale);
  if (!outcome.ok) {
    // 503, not 500: the request was fine, the upstream service was not, and
    // the admin page words its retry prompt off exactly that distinction.
    return NextResponse.json({ error: outcome.error }, { status: 503 });
  }

  return NextResponse.json({ fields: outcome.fields });
}
