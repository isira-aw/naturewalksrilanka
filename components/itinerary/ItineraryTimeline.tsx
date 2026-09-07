import type { ItineraryDay as ItineraryDayType } from "@/lib/content/schema";
import { Words } from "@/components/ui/motion";
import { ItineraryDay } from "@/components/itinerary/ItineraryDay";

export function ItineraryTimeline({
  days,
  itineraryTitle,
  contentRequiredLabel,
}: {
  days: ItineraryDayType[];
  itineraryTitle: string;
  contentRequiredLabel: string;
}) {
  return (
    <div>
      <Words
        text={itineraryTitle}
        className="font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
      />
      <div className="mt-10">
        {days.map((day, i) => (
          <ItineraryDay
            key={`${day.day}-${day.location}`}
            day={day}
            index={i}
            isLast={i === days.length - 1}
            defaultOpen={i === 0}
            contentRequiredLabel={contentRequiredLabel}
          />
        ))}
      </div>
    </div>
  );
}
