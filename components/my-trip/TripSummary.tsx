import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { TourRequest } from "@/lib/tourRequests/types";

/**
 * The trip as the traveller sent it.
 *
 * Read-only and plain: this page exists so somebody can check what they
 * asked for and see where it has got to, not to be a second wizard. The one
 * action is amending, which hands them back to the wizard they already
 * know rather than duplicating its editing here.
 */
export async function TripSummary({ request }: { request: TourRequest }) {
  const t = await getTranslations("myTrip");
  const { payload } = request;

  const dates =
    payload.dateRange.start && payload.dateRange.end
      ? `${payload.dateRange.start} → ${payload.dateRange.end}`
      : t("datesUnset");

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
        {t("referenceLabel")} {request.reference}
      </p>
      <h1 className="mt-2 font-display text-3xl text-charcoal">{t("title")}</h1>

      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest/10 px-4 py-1.5 text-sm text-forest">
        {t(`status.${request.status}`)}
      </div>

      <dl className="mt-8 divide-y divide-stone-dark overflow-hidden rounded-2xl border border-stone-dark bg-stone/20">
        <Row label={t("travellers")} value={String(payload.travelers)} />
        <Row label={t("dates")} value={dates} />
        <Row label={t("interests")} value={payload.interests.join(", ") || "-"} />
        {payload.selectedExperiences.length > 0 && (
          <Row label={t("itineraries")} value={payload.selectedExperiences.join(", ")} />
        )}
        <Row label={t("accommodation")} value={payload.accommodation.join(", ") || "-"} />
        {payload.accommodationNotes.trim() && (
          <Row label={t("accommodationNotes")} value={payload.accommodationNotes} />
        )}
        <Row label={t("name")} value={payload.name} />
        <Row label={t("email")} value={payload.email} />
        <Row label={t("phone")} value={payload.phone} />
        {payload.country.trim() && <Row label={t("country")} value={payload.country} />}
        {payload.requirements.trim() && (
          <Row label={t("requirements")} value={payload.requirements} />
        )}
      </dl>

      {request.revision > 0 && (
        <p className="mt-4 text-xs text-charcoal/50">
          {t("revisionNote", { count: request.revision })}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={{ pathname: "/custom-tour", query: { amend: request.reference } }}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark"
        >
          {t("amend")}
        </Link>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-charcoal/50">{t("changesHint")}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/55">{label}</dt>
      <dd className="whitespace-pre-line text-sm text-charcoal">{value}</dd>
    </div>
  );
}
