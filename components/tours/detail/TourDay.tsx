import { Photo } from "@/components/ui/Photo";
import type { ItineraryDay } from "@/lib/content/schema";
import { TourDayHighlights } from "./TourDayHighlights";

/**
 * One stop on the journey: the day number held in the margin, the
 * photograph, the place as the heading, what happens there, and — where the
 * itinerary names them — the species below it.
 *
 * Every tour is built from this, however many stops it has: a one-week tour
 * renders four of these and an eighteen-day tour renders ten. Nothing here
 * assumes a day count, and a day with no photograph (an airport transfer)
 * simply renders as type.
 */
export function TourDay({
  day,
  index,
  isLast,
  labels,
}: {
  day: ItineraryDay;
  index: number;
  isLast: boolean;
  labels: {
    dayLabel: string;
    birdingHighlights: string;
    wildlifeHighlights: string;
    contentRequired: string;
  };
}) {
  const highlightsLabel =
    day.highlightsKind === "wildlife" ? labels.wildlifeHighlights : labels.birdingHighlights;

  return (
    <article
      className={`grid gap-6 py-14 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-12 md:py-20 lg:grid-cols-[11rem_minmax(0,1fr)] ${
        isLast ? "" : "border-b border-line"
      }`}
    >
      <p className="font-utility text-[11px] uppercase tracking-[0.14em] text-ink md:sticky md:top-28 md:self-start">
        {labels.dayLabel}
        <span className="mt-1 block font-display text-4xl leading-none tracking-[-0.04em] md:text-5xl">
          {day.day}
        </span>
      </p>

      <div className="min-w-0">
        {day.image && (
          <div className="relative mb-7 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone sm:aspect-[3/2] md:mb-9 md:aspect-[16/9] md:rounded-3xl">
            <Photo
              src={day.image}
              alt={`${day.location} — ${day.title}`}
              sizes="(min-width: 768px) 70vw, 100vw"
              /* The first stop is close enough to the fold on a phone to be
                 worth fetching eagerly; the rest wait. */
              priority={index === 0}
            />
          </div>
        )}

        <p className="font-utility text-[11px] uppercase tracking-[0.18em] text-sage">
          {day.location}
        </p>
        <h3 className="mt-3 font-display text-3xl leading-[1.03] tracking-[-0.03em] text-ink sm:text-4xl md:text-5xl">
          {day.title}
        </h3>

        {day.contentRequired && (
          <p className="mt-5 inline-flex items-center rounded-full border border-clay/40 bg-clay/10 px-3 py-1 font-utility text-[11px] uppercase tracking-[0.14em] text-clay">
            {day.note ?? labels.contentRequired}
          </p>
        )}

        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink/75">{day.description}</p>

        {day.highlights && day.highlights.length > 0 && (
          <TourDayHighlights label={highlightsLabel} items={day.highlights} />
        )}
      </div>
    </article>
  );
}
