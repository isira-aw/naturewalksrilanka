"use client";

import { categoryLabel } from "@/lib/itineraries/categories";
import { provinceLabel } from "@/lib/geo/sriLanka";
import { TRANSLATION_LOCALES, type ItineraryRecord } from "@/lib/itineraries/types";
import { localeNames } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

/**
 * Every itinerary that exists, whether or not travellers can see it. Hidden
 * ones stay listed and greyed rather than disappearing — an itinerary out of
 * season should be easy to bring back, and easy to notice is missing.
 */
export function ItineraryList({
  records,
  loaded,
  onAdd,
  onEdit,
  onToggleHidden,
  onDelete,
}: {
  records: ItineraryRecord[];
  loaded: boolean;
  onAdd: () => void;
  onEdit: (record: ItineraryRecord) => void;
  onToggleHidden: (record: ItineraryRecord) => void;
  onDelete: (record: ItineraryRecord) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-charcoal">Itineraries</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">
            Everything the custom-tour wizard can offer, across all five categories.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="min-h-11 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark"
        >
          Add Itineraries
        </button>
      </div>

      {!loaded ? (
        <p className="mt-10 text-sm text-charcoal/45">Loading…</p>
      ) : records.length === 0 ? (
        <p className="mt-10 max-w-lg rounded-2xl border border-dashed border-stone-dark px-6 py-10 text-center text-sm leading-relaxed text-charcoal/50">
          No itineraries yet. Add the first one and it appears in the wizard straight away.
        </p>
      ) : (
        <ul className="mt-7 space-y-3">
          {records.map((record) => (
            <li
              key={record.id}
              className={cn(
                "rounded-2xl border border-stone-dark bg-warm-white p-4 sm:p-5",
                record.hidden && "opacity-60"
              )}
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-stone">
                  {record.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={record.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-utility text-[10px] uppercase tracking-wide text-forest">
                    {categoryLabel(record.category)} · {provinceLabel(record.province)}
                  </p>
                  <h3 className="mt-1 font-display text-lg leading-snug text-charcoal">
                    {record.head}
                    {record.hidden && (
                      <span className="ml-2 rounded-full bg-charcoal/10 px-2 py-0.5 align-middle font-utility text-[10px] uppercase tracking-wide text-charcoal/55">
                        Hidden
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 font-utility text-[11px] text-charcoal/45">
                    {record.images.length} photo{record.images.length === 1 ? "" : "s"} ·{" "}
                    {record.highlights.length} what-you-might-see ·{" "}
                    {readyCount(record)}/{TRANSLATION_LOCALES.length} languages
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <RowButton onClick={() => onEdit(record)}>Edit</RowButton>
                  <RowButton onClick={() => onToggleHidden(record)}>
                    {record.hidden ? "Show" : "Hide"}
                  </RowButton>
                  <RowButton onClick={() => onDelete(record)} danger>
                    Delete
                  </RowButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function readyCount(record: ItineraryRecord) {
  return TRANSLATION_LOCALES.filter((locale) => record.translations[locale]?.status === "ready")
    .length;
}

export function localeName(locale: string) {
  return localeNames[locale as keyof typeof localeNames] ?? locale;
}

function RowButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-4 font-utility text-xs uppercase tracking-wide transition-colors",
        danger
          ? "border-stone-dark text-charcoal/60 hover:border-clay hover:text-clay"
          : "border-stone-dark text-charcoal/70 hover:border-forest hover:text-forest"
      )}
    >
      {children}
    </button>
  );
}
