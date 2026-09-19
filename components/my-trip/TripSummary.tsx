import { getTranslations } from "next-intl/server";
import type { TourRequest } from "@/lib/tourRequests/types";
import { CommentThread } from "@/components/comments/CommentThread";
import { DeleteTripButton } from "./DeleteTripButton";

/**
 * One trip, as the traveller sent it.
 *
 * Read-only, and that is the design rather than a limitation. What somebody
 * asked for is the record a quote gets built against; a form that could
 * change it after the fact would move the ground under a team who may
 * already have priced it, and would leave neither side able to say what was
 * actually agreed. This page used to carry a contact-details form for that
 * reason — four fields, versioned, with a whole revisions subcollection
 * behind it — and it is gone along with the versioning it needed.
 *
 * Two things the traveller *can* do: say something, on the thread below,
 * where the team sees it against this enquiry and can answer in the same
 * place; and delete the whole enquiry, which is theirs to do and nobody
 * else's.
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

      <p className="mt-4 text-xs leading-relaxed text-charcoal/50">{t("readOnlyNote")}</p>

      <CommentThread
        endpoint={`/api/traveller/requests/${encodeURIComponent(request.reference)}/comments`}
        labels={{
          title: t("threadTitle"),
          intro: t("threadIntro"),
          placeholder: t("threadPlaceholder"),
          submit: t("threadSubmit"),
          submitting: t("threadSubmitting"),
          empty: t("threadEmpty"),
          loading: t("threadLoading"),
          failed: t("threadFailed"),
          full: t("threadFull"),
          fromTraveller: t("threadFromYou"),
          fromStaff: t("threadFromUs"),
        }}
      />

      <DeleteTripButton reference={request.reference} />
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
