import { SectionHeading } from "@/components/ui/SectionHeading";
import { ItineraryDay } from "@/components/itinerary/ItineraryDay";
import type { ItineraryDay as ItineraryDayType } from "@/lib/content/schema";

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
      <SectionHeading title={itineraryTitle} />
      <div className="mt-10">
        {days.map((day, i) => (
          <ItineraryDay
            key={`${day.day}-${day.location}`}
            day={day}
            isLast={i === days.length - 1}
            defaultOpen={i === 0}
            contentRequiredLabel={contentRequiredLabel}
          />
        ))}
      </div>
    </div>
  );
}
