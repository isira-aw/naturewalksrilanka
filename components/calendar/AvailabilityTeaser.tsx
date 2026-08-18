import { Link } from "@/i18n/navigation";

export function AvailabilityTeaser({
  labels,
}: {
  labels: { eyebrow: string; title: string; subtitle: string; cta: string };
}) {
  return (
    <section className="border-y border-stone-dark bg-warm-white py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center md:px-10">
        <div>
          <p className="mb-2 font-utility text-xs uppercase tracking-[0.2em] text-forest">
            {labels.eyebrow}
          </p>
          <h2 className="font-display text-2xl text-charcoal md:text-3xl">{labels.title}</h2>
          <p className="mt-2 max-w-md text-charcoal/70">{labels.subtitle}</p>
        </div>
        <Link
          href="/custom-tour"
          className="shrink-0 rounded-full border border-forest px-6 py-3 font-medium text-forest transition-colors hover:bg-forest hover:text-warm-white"
        >
          {labels.cta}
        </Link>
      </div>
    </section>
  );
}
