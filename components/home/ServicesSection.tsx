import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { BadgeIcon, LodgeIcon, RouteIcon, VehicleIcon } from "@/components/ui/icons";

export type Service = { title: string; short: string };

/**
 * What the company itself arranges — four icons and four short lines, which is
 * the whole answer to "do I still need a tour operator on top of this?".
 */
const ICONS = [BadgeIcon, LodgeIcon, VehicleIcon, RouteIcon];

export function ServicesSection({
  labels,
  services,
}: {
  labels: { eyebrow: string; title: string };
  services: Service[];
}) {
  return (
    <Section tone="warm">
      <Reveal className="max-w-2xl">
        <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
          {labels.eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
          {labels.title}
        </h2>
      </Reveal>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <Reveal as="li" key={service.title} delay={index * 0.08}>
              <div className="group h-full rounded-2xl border border-stone-dark bg-stone/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-forest/30 hover:bg-warm-white hover:shadow-[0_14px_40px_rgba(28,30,27,0.08)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest/10 text-forest transition-colors duration-300 group-hover:bg-forest group-hover:text-warm-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-xl text-charcoal">{service.title}</h3>
                <p className="mt-2 leading-relaxed text-charcoal/65">{service.short}</p>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </Section>
  );
}
