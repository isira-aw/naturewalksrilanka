import { NextResponse } from "next/server";
import { adminAuth, adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { adminIdentity } from "@/lib/admin/auth";
import { listRefusals } from "@/lib/admin/signInGuard";
import { hasSuperAdmin, isSuperAdmin, superAdmins } from "@/lib/admin/superAdmin";

export const dynamic = "force-dynamic";

/**
 * Who may sign in to the panel, managed from inside the panel.
 *
 * Both halves of the check are handled here — the `staff` document *and* the
 * `admin` custom claim — because doing only one silently produces an account
 * that cannot sign in and gives no clue why. Granting the claim from the
 * server is what makes the panel self-sufficient; `scripts/grant-admin.mjs`
 * is still needed for the very first admin, since somebody has to be able to
 * press this button before anybody can.
 *
 * An address with no Firebase account yet is a normal case: staff are usually
 * added before their first sign-in. The claim is then set on their next
 * visit — see `createAdminSession`, which is where the two are compared.
 */
type StaffEntry = {
  email: string;
  addedAt?: string;
  addedBy?: string;
  /**
   * Whether a Firebase account exists yet. Staff are usually added before
   * their first sign-in, and the panel says so rather than looking broken.
   *
   * The `admin` claim is deliberately not reported. It is a cache of this
   * list now, granted on first sign-in, so it can only ever disagree with
   * the list for as long as it takes them to sign in once.
   */
  hasAccount: boolean;
};

async function requireIdentity(request: Request) {
  if (!isFirebaseConfigured()) return { error: "not_configured" as const, status: 503 };
  const email = await adminIdentity(request);
  if (!email) return { error: "unauthorized" as const, status: 401 };
  return { email };
}

/**
 * Editing the access list is a super admin's job — see
 * `lib/admin/superAdmin.ts`. Every admin may read it.
 */
async function requireSuperAdmin(request: Request) {
  const who = await requireIdentity(request);
  if ("error" in who) return who;
  if (!isSuperAdmin(who.email)) return { error: "forbidden" as const, status: 403 };
  return who;
}

export async function GET(request: Request) {
  const who = await requireIdentity(request);
  if ("error" in who) {
    return NextResponse.json({ error: who.error }, { status: who.status });
  }

  const db = adminDb();
  const auth = adminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const snapshot = await db.collection(COLLECTIONS.staff).get();

    const staff: StaffEntry[] = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as { addedAt?: string; addedBy?: string };
        try {
          await auth.getUserByEmail(doc.id);
          return {
            email: doc.id,
            addedAt: data.addedAt,
            addedBy: data.addedBy,
            hasAccount: true,
          };
        } catch {
          /* No Firebase account yet — they have been added but have not
             signed in. Not an error, and not something to hide. */
          return {
            email: doc.id,
            addedAt: data.addedAt,
            addedBy: data.addedBy,
            hasAccount: false,
          };
        }
      }),
    );

    staff.sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({
      staff,
      refusals: await listRefusals(),
      /* The panel hides its editing controls off this rather than guessing
         from the address, and says *why* they are hidden — an unset
         SUPER_ADMIN_EMAIL and a deliberate read-only view look identical
         otherwise, and only one of them is intended. */
      canEdit: isSuperAdmin(who.email),
      superAdminConfigured: hasSuperAdmin(),
      superAdmins: isSuperAdmin(who.email) ? superAdmins() : [],
    });
  } catch (error) {
    console.error("Could not read the access list:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

/** Adds an address to the staff list, and grants the claim if they exist. */
export async function POST(request: Request) {
  const who = await requireSuperAdmin(request);
  if ("error" in who) {
    return NextResponse.json({ error: who.error }, { status: who.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = (body as { email?: unknown })?.email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  /* Deliberately shallow. The address has to match a real Google account to
     be any use, so an over-clever pattern here only rejects valid ones. */
  if (!email.includes("@") || email.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const db = adminDb();
  const auth = adminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    await db.collection(COLLECTIONS.staff).doc(email).set({
      addedAt: new Date().toISOString(),
      addedBy: who.email,
    });

    /* If they already have an account, grant the claim now. If they do not,
       the list entry is enough — the claim is set when they first sign in. */
    let hasAccount = false;
    try {
      const user = await auth.getUserByEmail(email);
      await auth.setCustomUserClaims(user.uid, { admin: true });
      hasAccount = true;
    } catch {
      /* No account yet. Expected, and reported rather than swallowed. */
    }

    return NextResponse.json({ email, hasAccount });
  } catch (error) {
    console.error(`Could not add ${email} to staff:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

/**
 * Removes someone's access, completely.
 *
 * All three steps matter: the list entry, the claim, and the refresh tokens.
 * Dropping only the document leaves a live session working for up to eight
 * hours, and leaves a claim behind that would let them back in the moment
 * anyone re-adds the address.
 */
export async function DELETE(request: Request) {
  const who = await requireSuperAdmin(request);
  if ("error" in who) {
    return NextResponse.json({ error: who.error }, { status: who.status });
  }

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  /* Removing your own access locks you out of the panel you are standing in. */
  if (email === who.email) {
    return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 });
  }

  /* A super admin's access does not come from this list, so removing their
     row would not take it away — it would only make the list disagree with
     reality. Refused, rather than doing something that looks like it worked. */
  if (isSuperAdmin(email)) {
    return NextResponse.json({ error: "cannot_remove_super_admin" }, { status: 400 });
  }

  const db = adminDb();
  const auth = adminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    await db.collection(COLLECTIONS.staff).doc(email).delete();

    try {
      const user = await auth.getUserByEmail(email);
      await auth.setCustomUserClaims(user.uid, { admin: false });
      /* Takes effect on their very next request, because every check uses
         `verifySessionCookie(cookie, true)`. */
      await auth.revokeRefreshTokens(user.uid);
    } catch {
      /* No account to revoke. The list entry is gone, which is the point. */
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error(`Could not remove ${email} from staff:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
