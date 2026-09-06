import { Section } from "@/components/ui/Section";

export type Service = { title: string; description: string };

/**
 * What the company itself arranges. This is the block that answers "do I still
 * need a tour operator on top of this?" — guides, beds, vehicles and the
 * itinerary all come from Nature Walks Sri Lanka.
 */
export function ServicesSection({
  labels,
  services,
}: {
  labels: { eyebrow: string; title: string; body: string };
  services: Service[];
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
        <p className="mt-6 leading-relaxed text-charcoal/70">{labels.body}</p>
      </div>

      <ul className="mt-14 grid gap-x-12 gap-y-10 border-t border-stone-dark pt-10 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service, index) => (
          <li key={service.title}>
            <span className="font-utility text-xs tracking-[0.2em] text-forest/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 font-display text-xl text-charcoal">{service.title}</h3>
            <p className="mt-3 leading-relaxed text-charcoal/70">{service.description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
