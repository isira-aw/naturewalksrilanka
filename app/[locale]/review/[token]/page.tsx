import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getInvite } from "@/lib/reviews/store";
import { isInviteUsable } from "@/lib/reviews/types";
import { ReviewForm } from "@/components/review/ReviewForm";

/* The token is in the URL and the answer depends on it: never cached. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The review form, reached by a one-time link the team sent.
 *
 * The token is the whole credential, which is why it is long, random,
 * single-use and expiring. Validity is checked here so somebody with a
 * spent or stale link is told plainly rather than filling in a form that
 * will be refused when they press send.
 */
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("review");

  if (!isFirebaseConfigured()) {
    return <Shell><Notice>{t("unavailable")}</Notice></Shell>;
  }

  const invite = await getInvite(token);

  /* An unknown token and a spent one are told apart on purpose here: this
     page is only ever reached by someone holding a link, and "you have
     already left a review" is far more useful than a blank refusal. There
     is nothing to enumerate — a wrong token reveals only that it is
     wrong. */
  if (!invite) {
    return <Shell><Notice>{t("linkUnknown")}</Notice></Shell>;
  }

  if (!isInviteUsable(invite)) {
    return (
      <Shell>
        <Notice>{invite.usedAt ? t("linkUsed") : t("linkExpired")}</Notice>
      </Shell>
    );
  }

  return (
    <Shell>
      <ReviewForm token={invite.token} name={invite.name} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="px-4 py-16 sm:px-6 sm:py-24 md:px-10">{children}</main>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-lg rounded-2xl border border-stone-dark bg-stone/20 p-6 text-sm leading-relaxed text-charcoal">
      {children}
    </p>
  );
}
