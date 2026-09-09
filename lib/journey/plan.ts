import type { Experience } from "@/lib/content/schema";
import {
  ARRIVAL_POINT,
  locateItinerary,
  orderByRoute,
  roadEstimate,
  type LatLng,
} from "@/lib/geo/sriLanka";
import { countDays, type DateRangeValue } from "@/lib/tour/dateRange";

/**
 * Turns the itineraries a traveller ticked into an actual journey: a driving
 * order, a day for each stop, and the road between them.
 *
 * The traveller picks itineraries because each one appeals, not in the order
 * they would be visited — left as chosen, a plan can cross the island four
 * times. So the stops are re-ordered into the loop a guide would really drive
 * (see `orderByRoute`), starting from the airport, and then laid against the
 * arrival and departure dates.
 *
 * Everything here is arithmetic on the traveller's own choices. Nothing is
 * generated or invented, which is what makes the same selection always produce
 * the same plan.
 */

export type PlannedStop = {
  experience: Experience;
  /** 1-based position along the route. */
  order: number;
  position: LatLng;
  /** Days spent here, from the itinerary's suggested length. */
  days: number;
  /** 1-based day of the trip this stop starts and ends on. */
  startDay: number;
  endDay: number;
  /** The drive in from the previous stop — from the airport for the first. */
  legKm: number;
  legMinutes: number;
};

export type JourneyPlan = {
  stops: PlannedStop[];
  /** Straight sum of the legs, rounded. */
  totalKm: number;
  /** Days the traveller's own dates give them, or 0 if they have not picked. */
  tripDays: number;
  /** Days the chosen itineraries actually need. */
  plannedDays: number;
  /** The itineraries need more days than the dates allow. */
  overflow: boolean;
};

/** A stop with no stated length still has to take some time. */
const DEFAULT_STOP_DAYS = 2;
const MAX_STOP_DAYS = 14;

export function buildJourneyPlan(
  experiences: Experience[],
  dateRange: DateRangeValue
): JourneyPlan {
  const ordered = orderByRoute(experiences, positionOf);

  let previous: LatLng = ARRIVAL_POINT;
  let day = 1;
  let totalKm = 0;

  const stops: PlannedStop[] = ordered.map((experience, index) => {
    const position = positionOf(experience);
    const leg = roadEstimate(previous, position);
    const days = stopDays(experience.duration);

    const stop: PlannedStop = {
      experience,
      order: index + 1,
      position,
      days,
      startDay: day,
      endDay: day + days - 1,
      legKm: leg.km,
      legMinutes: leg.minutes,
    };

    previous = position;
    day += days;
    totalKm += leg.km;
    return stop;
  });

  const tripDays = countDays(dateRange);
  const plannedDays = day - 1;

  return {
    stops,
    totalKm: Math.round(totalKm),
    tripDays,
    plannedDays,
    overflow: tripDays > 0 && plannedDays > tripDays,
  };
}

function positionOf(experience: Experience): LatLng {
  return locateItinerary(experience.location, experience.province ?? "western");
}

/**
 * Reads a day count out of a suggested length written for people — "2–3 days",
 * "a long weekend", "Full day". Takes the first number it finds, because a
 * range like "2–3 days" should be planned at its shorter end and stretched by
 * the operator, not the other way round.
 */
export function stopDays(duration: string): number {
  const match = duration.match(/\d+/);
  if (!match) return DEFAULT_STOP_DAYS;
  const parsed = parseInt(match[0], 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_STOP_DAYS;
  return Math.min(MAX_STOP_DAYS, parsed);
}

/** "3h 20m" / "45m" — the same wording the wizard already used for drives. */
export function formatDrive(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
