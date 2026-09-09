"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ARRIVAL_POINT } from "@/lib/geo/sriLanka";
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
 */
export function JourneyPlanStep({
  plan,
  onDownload,
  pending,
  failed,
}: {
  plan: JourneyPlan;
  onDownload: (kind: "pdf" | "doc") => void;
  pending: "pdf" | "doc" | null;
  failed: boolean;
}) {
  const t = useTranslations("customTour");
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
                      <Photo src={stop.experience.images[0]} alt="" sizes="7rem" />
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

      <section className="mt-10 border-t border-stone-dark pt-8">
        <h3 className="font-display text-lg text-charcoal">{p("downloadTitle")}</h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-charcoal/55">
          {p("downloadHint")}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onDownload("pdf")}
            disabled={pending !== null}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-7 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:cursor-wait disabled:opacity-60"
          >
            {pending === "pdf" ? t("downloadPreparing") : t("downloadPdf")}
          </button>
          <button
            type="button"
            onClick={() => onDownload("doc")}
            disabled={pending !== null}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest px-7 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-warm-white disabled:cursor-wait disabled:opacity-60"
          >
            {pending === "doc" ? t("downloadPreparing") : t("downloadDoc")}
          </button>
        </div>

        {failed && (
          <p role="alert" className="mt-3 text-sm text-clay">
            {t("downloadError")}
          </p>
        )}
      </section>
    </div>
  );
}

/** Where every journey starts, exported so the map and the copy agree. */
export const JOURNEY_START = ARRIVAL_POINT;
