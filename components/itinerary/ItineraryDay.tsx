import { Accordion } from "@/components/ui/Accordion";
import type { ItineraryDay as ItineraryDayType } from "@/lib/content/schema";

export function ItineraryDay({
  day,
  isLast,
  defaultOpen = false,
  contentRequiredLabel,
}: {
  day: ItineraryDayType;
  isLast?: boolean;
  defaultOpen?: boolean;
  contentRequiredLabel: string;
}) {
  return (
    <div className="relative flex gap-6 pb-12 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[1.6rem] top-2 -ml-px h-full w-px bg-forest/25 md:left-[3.2rem]"
        />
      )}

      <div className="relative z-10 w-14 shrink-0 md:w-24">
        <span className="block font-utility text-lg leading-none tracking-tight text-forest md:text-2xl">
          {day.day}
        </span>
        <span
          aria-hidden="true"
          className="mt-3 block h-2.5 w-2.5 rounded-full border-2 border-forest bg-warm-white"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-display text-xl text-charcoal md:text-2xl">{day.location}</p>

        {day.contentRequired && (
          <p className="mt-2 inline-flex items-center rounded-full border border-clay/40 bg-clay/10 px-3 py-1 font-utility text-[11px] uppercase tracking-wide text-clay">
            {day.note ?? contentRequiredLabel}
          </p>
        )}

        <div className="mt-3">
          <Accordion
            title={
              <span className="text-sm font-medium text-charcoal">{day.title}</span>
            }
            defaultOpen={defaultOpen}
          >
            <p className="text-sm leading-relaxed text-charcoal/80">{day.description}</p>
            {day.highlights && day.highlights.length > 0 && (
              <ul className="mt-4 space-y-2">
                {day.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-charcoal/75">
                    <span aria-hidden="true" className="text-forest">
                      —
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
