import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { adminIdentity, requireAdmin } from "@/lib/admin/auth";
import { routing } from "@/i18n/routing";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { createInvite, listInvites } from "@/lib/reviews/store";

export const dynamic = "force-dynamic";

/** The most recent links, which is the whole record of who has been asked. */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  return NextResponse.json({ invites: await listInvites() });
}

/**
 * Creates a review invitation.
 *
 * A link carries only a label the team typed for its own benefit and the
 * language the form should open in. It is not tied to an enquiry and not
 * emailed anywhere: the team pastes it into a conversation it is already
 * having, with whoever it wants a review from.
 *
 * Only a signed-in admin reaches this, which is the whole of the
 * authorisation — there is nothing here for a stranger to abuse.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { label, locale } = (body ?? {}) as { label?: unknown; locale?: unknown };

  /* The language decides which form the traveller lands on, so it has to be
     one the site actually has. */
  if (locale !== undefined && !(typeof locale === "string" && hasLocale(routing.locales, locale))) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  if (label !== undefined && typeof label !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  return NextResponse.json({
    invite: await createInvite(
      {
        label: (label ?? "").trim().slice(0, 120),
        locale: (locale as string | undefined) ?? routing.defaultLocale,
      },
      (await adminIdentity(request)) ?? "unknown",
    ),
  });
}
