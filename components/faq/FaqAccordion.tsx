import type { Faq } from "@/lib/content/schema";

/**
 * The frequently-asked questions, as a native disclosure list.
 *
 * `<details>`/`<summary>` rather than a React accordion, on purpose. It is
 * keyboard-operable, announced correctly and expandable with no JavaScript at
 * all — which matters here because this sits near the bottom of a page a
 * visitor may well reach before hydration finishes on a hotel wifi.
 *
 * The shared `name` makes it an exclusive accordion natively: opening one
 * closes the rest. Browsers without that attribute simply allow several open
 * at once, which is a perfectly good fallback rather than a broken one.
 *
 * No `FAQPage` JSON-LD. Google restricted that rich result to authoritative
 * government and health sites, so emitting it from a tour operator gains
 * nothing and is the kind of thing that attracts a manual review.
 *
 * An item still marked `contentRequired` is not rendered. A question with
 * "CONTENT_REQUIRED" where the answer should be would be worse than no
 * question at all — see `content/en/faq.json` for what is still outstanding.
 */
export function FaqAccordion({
  faq,
  eyebrow,
  title,
}: {
  faq: Faq;
  eyebrow: string;
  title: string;
}) {
  const answered = faq.items.filter((item) => !item.contentRequired);
  if (answered.length === 0) return null;

  return (
    <section className="bg-warm-white py-20 md:py-28">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-10">
        <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">{eyebrow}</p>
        <h2 className="mt-3 font-display text-2xl text-charcoal md:text-3xl">{title}</h2>

        <div className="mt-8 border-t border-stone-dark">
          {answered.map((item) => (
            <details
              key={item.question}
              name="faq"
              className="group border-b border-stone-dark"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left font-medium text-charcoal transition-colors hover:text-forest [&::-webkit-details-marker]:hidden">
                <span className="text-[0.95rem] leading-relaxed">{item.question}</span>
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-dark text-charcoal/50 transition-colors group-hover:border-forest group-hover:text-forest"
                >
                  <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    {/* The horizontal stroke stays; the vertical one is hidden
                        once open, turning the plus into a minus. */}
                    <path d="M0.5 5h9" strokeLinecap="round" />
                    <path d="M5 0.5v9" strokeLinecap="round" className="group-open:hidden" />
                  </svg>
                </span>
              </summary>
              <p className="pb-6 pr-10 text-sm leading-relaxed text-charcoal/70">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
