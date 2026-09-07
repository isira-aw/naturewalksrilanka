import type { Destination } from "@/lib/content/schema";
import { Kicker, Rise, Words } from "@/components/ui/motion";

/**
 * The written half of a destination page: the opening paragraph beside a strip
 * of hard facts, then the prose sections as wide editorial blocks. Everything
 * here is optional in the content model, so a destination that only has its
 * short description still renders as a complete, if shorter, page.
 */
export function DestinationStory({
  destination,
  labels,
}: {
  destination: Destination;
  labels: { eyebrow: string; factsTitle: string };
}) {
  const facts = destination.facts ?? [];

  return (
    <section className="bg-warm-white py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Kicker>{labels.eyebrow}</Kicker>
            <Rise delay={0.1}>
              <p className="mt-8 text-xl leading-relaxed text-charcoal/80 md:text-2xl md:leading-[1.5]">
                {destination.intro ?? destination.description}
              </p>
            </Rise>
          </div>

          {facts.length > 0 && (
            <Rise delay={0.2} className="md:col-span-5 md:pt-4">
              <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
                {labels.factsTitle}
              </p>
              <dl className="mt-6 border-t border-charcoal/15">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="grid gap-1 border-b border-charcoal/15 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6"
                  >
                    <dt className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45">
                      {fact.label}
                    </dt>
                    <dd className="text-charcoal/80">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Rise>
          )}
        </div>

        {destination.sections && destination.sections.length > 0 && (
          <div className="mt-20 grid gap-12 md:mt-24 md:grid-cols-12 md:gap-16">
            {destination.sections.map((section, index) => (
              <div
                key={section.title}
                className="md:col-span-6 md:col-start-1 lg:col-span-5 lg:[&:nth-child(even)]:col-start-8"
              >
                <Rise delay={0.05}>
                  <p className="font-utility text-xs uppercase tracking-[0.2em] text-charcoal/35">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                </Rise>
                <Words
                  as="h2"
                  text={section.title}
                  delay={0.05}
                  className="mt-4 font-display text-2xl leading-tight text-charcoal md:text-3xl"
                />
                <Rise delay={0.15}>
                  <p className="mt-5 leading-relaxed text-charcoal/70">{section.body}</p>
                </Rise>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
