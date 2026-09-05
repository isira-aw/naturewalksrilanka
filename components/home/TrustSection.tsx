import { Section } from "@/components/ui/Section";

/**
 * The credibility block — three reasons, stated plainly, closed by the
 * conservation note that explains where the guiding came from.
 */
export function TrustSection({
  labels,
  points,
}: {
  labels: { eyebrow: string; title: string; note: string };
  points: { title: string; description: string }[];
}) {
  return (
    <Section tone="warm">
      <div className="max-w-2xl">
        <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
          {labels.eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
          {labels.title}
        </h2>
      </div>

      <div className="mt-14 grid gap-10 border-t border-stone-dark pt-10 md:grid-cols-3 md:gap-12">
        {points.map((point) => (
          <div key={point.title}>
            <h3 className="font-display text-xl text-charcoal">{point.title}</h3>
            <p className="mt-3 leading-relaxed text-charcoal/70">{point.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-14 max-w-2xl border-l-2 border-clay pl-5 leading-relaxed text-charcoal/60">
        {labels.note}
      </p>
    </Section>
  );
}
