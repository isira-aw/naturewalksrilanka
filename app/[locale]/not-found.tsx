import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { Rise } from "@/components/ui/motion";
import { ButtonLink } from "@/components/ui/Button";

/**
 * The 404 inside a valid locale — a mistyped tour or destination slug, or an
 * old bookmark. It renders inside the locale layout, so it keeps the header,
 * the footer and the language switcher: someone who lands here is still on
 * the site and should be able to carry on rather than reach for the back
 * button.
 *
 * Deliberately routes onward rather than apologising. The three links below
 * are the pages a lost visitor actually wants, and they are the same three
 * the home page pushes hardest.
 *
 * Not localised. `not-found.tsx` renders outside the request's
 * `next-intl` message scope, and hand-writing five translations of an error
 * page is exactly the kind of invented content this project avoids — so it
 * is English, like the privacy page, until a translator supplies the rest.
 */
export const metadata: Metadata = {
  title: "Page not found | Nature Walks Sri Lanka",
  /* A 404 that gets indexed is worse than one that does not exist. Next sends
     the 404 status too, but this makes the intent explicit. */
  robots: { index: false, follow: true },
};

export default function LocaleNotFound() {
  return (
    <>
      <PageHero
        eyebrow="404"
        title={"This trail\nleads nowhere"}
        lead="The page you were looking for has moved, or never existed. Everything else is still here."
        image={{
          src: "/images/hero/hero-3.jpg",
          alt: "A forest path disappearing into the canopy",
        }}
        height="short"
      />

      <section className="bg-warm-white pb-24 pt-16 md:pb-32 md:pt-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-10">
          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">
              Where would you like to go?
            </h2>
          </Rise>

          <Rise>
            <ul className="mt-8 divide-y divide-stone-dark border-y border-stone-dark">
              {[
                { href: "/tours", title: "Journeys", body: "Four private itineraries, from ten days to eighteen." },
                { href: "/destinations", title: "Sri Lanka", body: "The parks, ancient cities and highland trails we visit." },
                { href: "/custom-tour", title: "Plan a custom tour", body: "Tell us how you travel and we will shape a journey around it." },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-baseline justify-between gap-6 py-5 transition-colors hover:text-forest"
                  >
                    <span>
                      <span className="font-display text-lg text-charcoal transition-colors group-hover:text-forest">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-charcoal/60">
                        {item.body}
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 14 12"
                      className="mt-1 h-3 w-3.5 shrink-0 text-charcoal/30 transition-all group-hover:translate-x-1 group-hover:text-forest"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M1 6h11.5M8 1.5 12.5 6 8 10.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </Rise>

          <Rise>
            <div className="mt-10">
              <ButtonLink href="/" variant="secondary">
                Back to the home page
              </ButtonLink>
            </div>
          </Rise>
        </div>
      </section>
    </>
  );
}
