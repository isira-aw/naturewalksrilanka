import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { isAdminSession } from "@/lib/admin/auth";

/* Reading the session cookie makes this request-time work; it must never be
   prerendered or cached, or one visitor's answer would serve another. */
export const dynamic = "force-dynamic";

/**
 * Deliberately kept out of search engines and out of the site's own
 * navigation: it is reached by typing the address, and getting past the
 * sign-in needs credentials only the operator has. `app/robots.ts` disallows
 * it too.
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The gate and the frame, shared by every admin section.
 *
 * Checking the session here rather than in each page means one verification
 * per navigation instead of one per section, and an unauthenticated visitor
 * never receives any section's markup — the sign-in form is all that is sent.
 *
 * There is deliberately **no `loading.tsx` anywhere under `admin/`**. A
 * `loading.tsx` opens a Suspense boundary, and once that boundary starts
 * streaming the HTTP status has already gone out — so a `notFound()` thrown
 * below it can no longer set 404. That mistake turned every mistyped slug on
 * this site into a soft 200 once already. Section-level loading UI belongs in
 * a `<Suspense>` *inside* a page, under the `notFound()` check.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /* Settled on the server, so an unauthenticated visitor never receives the
     panel's markup and an authenticated one never sees a sign-in flash. */
  if (!(await isAdminSession())) return <AdminSignIn />;

  /* The admin tool itself is English-only — the locale segment is here only
     because every route on this site carries one. */
  return <AdminShell>{children}</AdminShell>;
}
