import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { adminIdentity, requireAdmin } from "@/lib/admin/auth";
import { routing } from "@/i18n/routing";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getRequest } from "@/lib/tourRequests/store";
import { createInvite, invitesForReference, listInvites } from "@/lib/reviews/store";

export const dynamic = "force-dynamic";

/**
 * Invites already sent for one enquiry, or the most recent ones overall.
 *
 * The second is what the panel lists: a link made by hand belongs to no
 * enquiry, so there is nothing to look it up by afterwards.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const reference = new URL(request.url).searchParams.get("reference");

  return NextResponse.json({
    invites: reference ? await invitesForReference(reference) : await listInvites(),
  });
}

/**
 * Creates a review invitation, from an enquiry or from nothing.
 *
 * With a reference, the traveller's name and email are copied from the
 * enquiry rather than accepted from the caller — the panel has no business
 * inventing somebody's address, and the copy is what ties the review to the
 * trip. Without one, the link carries only a label the team typed for its own
 * benefit and the language the form should open in. Neither kind is emailed
 * anywhere: the team pastes the link into a conversation it is already
 * having.
 *
 * Only a signed-in admin reaches either, which is the whole of the
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

  const { reference, label, locale } = (body ?? {}) as {
    reference?: unknown;
    label?: unknown;
    locale?: unknown;
  };
  const invitedBy = (await adminIdentity(request)) ?? "unknown";

  if (reference !== undefined && reference !== null && reference !== "") {
    if (typeof reference !== "string") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const enquiry = await getRequest(reference);
    if (!enquiry) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
      invite: await createInvite(
        {
          reference: enquiry.reference,
          email: enquiry.email,
          name: enquiry.payload.name,
          locale: enquiry.locale,
        },
        invitedBy,
      ),
    });
  }

  /* A link with no enquiry behind it. The language decides which form the
     traveller lands on, so it has to be one the site actually has. */
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
      invitedBy,
    ),
  });
}
