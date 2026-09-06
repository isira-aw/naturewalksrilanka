import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { BadgeIcon, BinocularsIcon, ChatIcon, LeafIcon } from "@/components/ui/icons";

const ICONS = [BadgeIcon, BinocularsIcon, ChatIcon];

/**
 * The credibility block — three reasons, one icon each, closed by the
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
      <Reveal className="max-w-2xl">
        <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
          {labels.eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
          {labels.title}
        </h2>
      </Reveal>

      <ul className="mt-12 grid gap-10 border-t border-stone-dark pt-10 md:grid-cols-3 md:gap-12">
        {points.map((point, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <Reveal as="li" key={point.title} delay={index * 0.08}>
              <Icon className="h-7 w-7 text-forest" />
              <h3 className="mt-4 font-display text-xl text-charcoal">{point.title}</h3>
              <p className="mt-2 leading-relaxed text-charcoal/65">{point.description}</p>
            </Reveal>
          );
        })}
      </ul>

      <Reveal className="mt-14 flex max-w-2xl gap-4 rounded-2xl bg-stone/60 p-6">
        <LeafIcon className="h-6 w-6 shrink-0 text-clay" />
        <p className="leading-relaxed text-charcoal/65">{labels.note}</p>
      </Reveal>
    </Section>
  );
}
