import type { Metadata } from "next";
import Link from "next/link";

/**
 * The root 404 — the one reached when the path is not under a valid locale
 * at all: `/xx/tours`, a bare `/nonsense`, or an old URL with no redirect.
 *
 * It renders outside `app/[locale]/layout.tsx`, so there is no header, no
 * footer, no `next-intl` provider and no locale to translate into. That is
 * why this is a self-contained English page rather than the richer one at
 * `app/[locale]/not-found.tsx`: the visitor has not told us a language yet,
 * and guessing one from a malformed URL would be worse than defaulting.
 *
 * Plain `next/link`, not the locale-aware one, for the same reason — the
 * links have to name their locale explicitly.
 */
export const metadata: Metadata = {
  title: "Page not found | Nature Walks Sri Lanka",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-utility text-xs uppercase tracking-[0.2em] text-charcoal/40">404</p>

      <h1 className="mt-5 max-w-xl font-display text-3xl leading-tight text-charcoal sm:text-4xl md:text-5xl">
        This page does not exist
      </h1>

      <p className="mt-5 max-w-md text-sm leading-relaxed text-charcoal/60 sm:text-base">
        The address may be mistyped, or the page may have moved. Nature Walks
        Sri Lanka is still here.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/en"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest bg-forest px-6 text-sm font-medium tracking-wide text-warm-white transition-colors hover:bg-forest-dark"
        >
          Go to the home page
        </Link>
        <Link
          href="/en/tours"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-charcoal/30 px-6 text-sm font-medium tracking-wide text-charcoal transition-colors hover:border-forest hover:text-forest"
        >
          Browse journeys
        </Link>
      </div>

      <p id="other-languages" className="mt-12 font-utility text-[11px] uppercase tracking-wide text-charcoal/35">
        Also available in
      </p>

      <div
        aria-labelledby="other-languages"
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
      >
        {[
          ["nl", "Nederlands"],
          ["es", "Español"],
          ["da", "Dansk"],
          ["fi", "Suomi"],
        ].map(([code, name]) => (
          <Link
            key={code}
            href={`/${code}`}
            className="text-xs text-charcoal/50 underline underline-offset-4 transition-colors hover:text-forest"
          >
            {name}
          </Link>
        ))}
      </div>
    </div>
  );
}
