/**
 * The species a stop is worth stopping for.
 *
 * Kept deliberately small. This is supporting information underneath the
 * photograph and the description, not a second headline: a white card on the
 * cream, one hairline, a tight radius, a compact label and the list set as
 * running text rather than as rows — a thirteen-species list rendered as
 * thirteen ruled rows is taller than the photograph above it and turns the
 * itinerary into a spreadsheet.
 *
 * Species names are not translated. They are proper nouns, and a birding
 * itinerary is read against field guides that use the English common name;
 * the heading above them is what carries the locale.
 */
export function TourDayHighlights({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-6 max-w-3xl rounded-2xl border border-line bg-white px-5 py-4 md:px-6 md:py-5">
      <p className="flex items-center gap-2 font-utility text-[11px] uppercase tracking-[0.12em] text-ink">
        <span aria-hidden="true" className="block h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
        {label}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
        {items.join(" · ")}
      </p>
    </div>
  );
}
