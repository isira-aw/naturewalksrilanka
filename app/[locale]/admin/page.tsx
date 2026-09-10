import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AdminApp } from "@/components/admin/AdminApp";
import { isAdminSession } from "@/lib/admin/auth";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /* Settled on the server, so an unauthenticated visitor never receives the
     panel's markup and an authenticated one never sees a sign-in flash. */
  const signedIn = await isAdminSession();

  /* The admin tool itself is English-only — the locale segment is here only
     because every route on this site carries one. */
  return <AdminApp initiallySignedIn={signedIn} />;
}
