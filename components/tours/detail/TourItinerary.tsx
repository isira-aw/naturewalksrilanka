import { Container } from "@/components/ui/Container";
import type { ItineraryDay } from "@/lib/content/schema";
import { TourDay } from "./TourDay";

/** The day-by-day, however many days that is. */
export function TourItinerary({
  days,
  title,
  labels,
}: {
  days: ItineraryDay[];
  title: string;
  labels: {
    dayLabel: string;
    birdingHighlights: string;
    wildlifeHighlights: string;
    contentRequired: string;
  };
}) {
  if (days.length === 0) return null;

  return (
    <section id="itinerary" className="scroll-mt-24 bg-warm-white py-16 md:py-20">
      <Container>
        <h2 className="font-utility text-[11px] uppercase tracking-[0.22em] text-muted">{title}</h2>
        <div className="mt-2">
          {days.map((day, index) => (
            <TourDay
              key={`${day.day}-${day.location}`}
              day={day}
              index={index}
              isLast={index === days.length - 1}
              labels={labels}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
