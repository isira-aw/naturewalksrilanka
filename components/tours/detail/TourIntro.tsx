import { Container } from "@/components/ui/Container";
import { EditorialList } from "@/components/ui/EditorialList";
import { Link } from "@/i18n/navigation";

/**
 * What the journey is, before the day-by-day: a statement on the left, the
 * tour's own summary on the right, and — because a traveller reading a
 * two-week itinerary wants to know where it goes before they read all of it —
 * the route and the highlights underneath.
 */
export function TourIntro({
  title,
  summary,
  highlights,
  destinations,
  labels,
}: {
  title: string;
  summary: string;
  highlights: string[];
  destinations: { slug: string; name: string; region: string }[];
  labels: { highlightsTitle: string; destinationsTitle: string };
}) {
  return (
    <section className="border-b border-line bg-warm-white py-20 md:py-24">
      <Container>
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <h2 className="font-display text-3xl leading-[1.08] tracking-[-0.025em] text-ink md:col-span-5 md:text-[2.75rem]">
            {title}
          </h2>
          <p className="text-lg leading-relaxed text-ink/75 md:col-span-7 md:text-xl">{summary}</p>
        </div>

        {(highlights.length > 0 || destinations.length > 0) && (
          <div className="mt-16 grid gap-12 md:mt-20 md:grid-cols-12 md:gap-16">
            {highlights.length > 0 && (
              <div className="md:col-span-7">
                <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-sage">
                  {labels.highlightsTitle}
                </p>
                <EditorialList items={highlights} numbered className="mt-6" />
              </div>
            )}

            {destinations.length > 0 && (
              <div className="md:col-span-5">
                <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-sage">
                  {labels.destinationsTitle}
                </p>
                <ul className="mt-6 border-t border-line">
                  {destinations.map((destination) => (
                    <li key={destination.slug} className="border-b border-line">
                      <Link
                        href={`/destinations/${destination.slug}`}
                        className="group flex items-baseline justify-between gap-6 py-3.5"
                      >
                        <span className="text-ink/80 transition-colors group-hover:text-forest">
                          {destination.name}
                        </span>
                        <span className="font-utility text-[11px] uppercase tracking-[0.14em] text-muted transition-colors group-hover:text-forest">
                          {destination.region}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
