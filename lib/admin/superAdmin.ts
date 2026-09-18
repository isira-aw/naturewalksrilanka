import "server-only";

/**
 * The accounts that may change who else has access.
 *
 * Every other admin can open the Access section and read it — seeing who is
 * on the list, and who has been trying to get in, is useful to anybody who
 * runs the site. Changing it is narrower: adding an admin is handing out the
 * keys, and an admin who can add admins can promote anyone, including someone
 * the owner would not have chosen.
 *
 * Held in the environment rather than in Firestore, deliberately. A super
 * admin recorded in the same database it administers can be edited by
 * whatever can write to that database; one in the environment can only be
 * changed by whoever can deploy. It is also the recovery path — see
 * `isSuperAdmin`, and note that a super admin does not need a `staff`
 * document to sign in.
 */

/** `SUPER_ADMIN_EMAIL`, one address or several separated by commas. */
export function superAdmins(): string[] {
  return (process.env.SUPER_ADMIN_EMAIL ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Is this address a super admin?
 *
 * Also the answer to "can this person still get in when the staff list is
 * wrong" — `createAdminSession` admits a super admin whether or not they hold
 * a `staff` document. Without that, an admin who removed the last entry, or a
 * bad import, would lock everybody out of the panel with no way back except a
 * command line and a service-account key.
 *
 * Comma-separated so there can be more than one. With exactly one, losing
 * that account means a redeploy to get back in.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return superAdmins().includes(email.trim().toLowerCase());
}

/**
 * Whether any super admin is configured at all.
 *
 * When none is, the Access section says so rather than silently refusing
 * every edit — an unset environment variable and a deliberate lockdown look
 * identical from the outside, and only one of them is intended.
 */
export function hasSuperAdmin(): boolean {
  return superAdmins().length > 0;
}
