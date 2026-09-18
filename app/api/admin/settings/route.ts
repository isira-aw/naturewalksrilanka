import { NextResponse } from "next/server";
import { adminIdentity } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { customTourSettingsSchema } from "@/lib/settings/customTour";
import { readCustomTourSettings, writeCustomTourSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * The custom-tour wizard's settings.
 *
 * Admin-only on both verbs. The *read* is behind auth even though the wizard
 * itself reads the same document on every public page load — but it does that
 * server-side, inside the page render. There is no reason to publish an
 * endpoint that hands out configuration to anyone who asks.
 */
export async function GET(request: Request) {
  if (!(await adminIdentity(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ settings: await readCustomTourSettings() });
}

export async function PUT(request: Request) {
  const email = await adminIdentity(request);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  /* `updatedAt` and `updatedBy` are the server's to set, not the caller's. */
  const parsed = customTourSettingsSchema
    .omit({ updatedAt: true, updatedBy: true })
    .safeParse((body as { settings?: unknown })?.settings);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_settings", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ settings: await writeCustomTourSettings(parsed.data, email) });
  } catch (error) {
    console.error("Could not save the custom tour settings:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
