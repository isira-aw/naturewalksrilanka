import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Destination } from "@/lib/content/schema";
import { Section } from "@/components/ui/Section";

/**
 * Sri Lanka in one section. Deliberately typographic rather than a photo grid:
 * every destination currently shares one placeholder image (see lib/content/imageMap.ts),
 * so a named list reads truer than six copies of the same photograph. Swap in a
 * DestinationGrid here once real per-destination photography exists.
 */
export function PlacesSection({
  destinations,
  labels,
}: {
  destinations: Destination[];
  labels: { eyebrow: string; title: string; body: string; cta: string };
}) {
  return (
    <Section tone="stone">
      <div className="grid gap-12 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-5">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm">
            <Image
              src="/images/story-1.jpg"
              alt="Dry-zone landscape in Sri Lanka's north west"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative mt-4 ml-auto aspect-[4/3] w-2/3 overflow-hidden rounded-sm">
            <Image
              src="/images/story-2.jpg"
              alt="Rainforest canopy in Sinharaja"
              fill
              sizes="(min-width: 768px) 27vw, 66vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="md:col-span-7 md:pt-8">
          <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
            {labels.eyebrow}
          </p>
          <h2 className="mt-4 max-w-xl font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
            {labels.title}
          </h2>
          <p className="mt-6 max-w-xl leading-relaxed text-charcoal/70">{labels.body}</p>

          <ul className="mt-10 border-t border-stone-dark">
            {destinations.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/destinations/${d.slug}`}
                  className="group flex items-baseline justify-between gap-6 border-b border-stone-dark py-4 transition-colors hover:text-forest"
                >
                  <span className="font-display text-lg text-charcoal transition-colors group-hover:text-forest">
                    {d.name}
                  </span>
                  <span className="font-utility text-xs uppercase tracking-[0.12em] text-charcoal/50">
                    {d.region}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/destinations"
            className="mt-8 inline-block font-medium text-forest underline underline-offset-8 transition-colors hover:text-forest-dark"
          >
            {labels.cta}
          </Link>
        </div>
      </div>
    </Section>
  );
}
