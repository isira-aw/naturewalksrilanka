"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { formatDrive, type JourneyPlan } from "@/lib/journey/plan";
import { Photo } from "@/components/ui/Photo";
import { StepHeading } from "./StepHeading";

const RouteMap = dynamic(() => import("./journey-plan/RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-80 w-full rounded-xl bg-stone/50 lg:h-[560px]" />,
});

/**
 * The journey, worked out.
 *
 * This step used to hand the trip to a language model and ask it to invent a
 * route. It no longer invents anything: the traveller has already said which
 * itineraries they want, so this takes exactly those, puts them in the order a
 * guide would drive them, fits them to the dates, and shows the result as a
 * written route beside a map. Everything it shows is what the documents print.
 *
 * There is nothing to download here: the take-away PDF is offered once, at the
 * end, on the review step, where the traveller has already given their name and
 * the document is worth keeping.
 */
export function JourneyPlanStep({ plan }: { plan: JourneyPlan }) {
  const p = useTranslations("customTour.journeyPlan");

  if (plan.stops.length === 0) {
    return (
      <div>
        <StepHeading title={p("title")} hint={p("intro")} />
        <p className="mt-8 max-w-xl rounded-2xl border border-dashed border-stone-dark px-6 py-10 text-center text-sm leading-relaxed text-charcoal/55">
          {p("empty")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <StepHeading title={p("title")} hint={p("intro")} />

      {plan.overflow && (
        <p
          role="status"
          className="mt-6 max-w-2xl rounded-xl bg-clay/10 px-4 py-3 text-sm leading-relaxed text-charcoal"
        >
          {p("overflowNote")}
        </p>
      )}

      {/* The written route and the map side by side once there is room: they
          are the same thing said twice, and reading one while looking at the
          other is the whole point of the step. */}
      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-10">
        <section>
          <h3 className="font-utility text-xs uppercase tracking-wide text-charcoal/60">
            {p("routeTitle")}
          </h3>

          <ol className="mt-4 space-y-3">
            <li className="flex items-center gap-3 text-sm text-charcoal/60">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-clay"
              />
              {p("startLabel")}
            </li>

            {plan.stops.map((stop) => (
              <li
                key={stop.experience.slug}
                className="rounded-2xl border border-stone-dark bg-warm-white p-4"
              >
                <div className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest font-utility text-sm text-warm-white">
                    {stop.order}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-utility text-[10px] uppercase tracking-wide text-forest">
                      {stop.startDay === stop.endDay
                        ? p("dayLabel", { day: stop.startDay })
                        : p("dayRangeLabel", { from: stop.startDay, to: stop.endDay })}{" "}
                      · {stop.experience.location}
                    </p>
                    <h4 className="mt-1 font-display text-lg leading-snug text-charcoal">
                      {stop.experience.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-charcoal/60">
                      {stop.experience.summary}
                    </p>
                    {stop.legKm > 0 && (
                      <p className="mt-2 font-utility text-xs text-charcoal/45">
                        {p("driveLabel", {
                          km: stop.legKm,
                          duration: formatDrive(stop.legMinutes),
                        })}
                      </p>
                    )}
                  </div>

                  {stop.experience.images[0] && (
                    <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-stone sm:block">
                      <Photo
                        src={stop.experience.images[0]}
                        alt=""
                        sizes="7rem"
                        blurDataURL={stop.experience.imageBlur?.[stop.experience.images[0]]}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-5 font-utility text-xs uppercase tracking-wide text-charcoal/45">
            {p("totalLabel", { count: plan.stops.length, km: plan.totalKm })}
          </p>
        </section>

        <div className="mt-8 lg:sticky lg:top-28 lg:mt-0">
          <h3 className="font-utility text-xs uppercase tracking-wide text-charcoal/60">
            {p("mapTitle")}
          </h3>
          <div className="mt-4">
            <RouteMap stops={plan.stops} arrivalLabel={p("startLabel")} />
          </div>
        </div>
      </div>
    </div>
  );
}
