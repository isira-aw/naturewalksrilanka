import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Tour } from "@/lib/content/schema";

export function TourCard({
  tour,
  labels,
}: {
  tour: Tour;
  labels: { cta: string; daysLabel: string };
}) {
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex flex-col overflow-hidden rounded-sm border border-stone-dark bg-warm-white transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={tour.heroImage}
          alt={tour.title}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full border border-warm-white/40 bg-charcoal/60 px-3 py-1 font-utility text-xs uppercase tracking-wide text-warm-white backdrop-blur-sm">
          {tour.durationDays} {labels.daysLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-2xl text-charcoal">{tour.title}</h3>
        <p className="mt-2 text-sm text-charcoal/70">{tour.tagline}</p>

        <ul className="mt-4 space-y-2">
          {tour.highlights.slice(0, 3).map((h) => (
            <li key={h} className="flex gap-2 text-sm text-charcoal/75">
              <span aria-hidden="true" className="text-forest">
                —
              </span>
              <span className="line-clamp-2">{h}</span>
            </li>
          ))}
        </ul>

        <span className="mt-6 inline-flex items-center gap-2 font-utility text-xs uppercase tracking-wide text-forest transition-colors group-hover:text-forest-dark">
          {labels.cta}
        </span>
      </div>
    </Link>
  );
}
