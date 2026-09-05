import type { Profile } from "@/lib/content/schema";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function WhyNandana({
  profile,
  eyebrow,
  title,
  points,
}: {
  profile: Profile;
  eyebrow: string;
  title: string;
  points: { title: string; description: string }[];
}) {
  return (
    <Section tone="stone">
      <SectionHeading eyebrow={eyebrow} title={title} className="max-w-2xl" />

      <div className="mt-14 grid gap-10 border-t border-stone-dark pt-10 md:grid-cols-3 md:gap-12">
        {points.map((point) => (
          <div key={point.title}>
            <h3 className="font-display text-xl text-charcoal">{point.title}</h3>
            <p className="mt-3 leading-relaxed text-charcoal/70">{point.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 font-utility text-xs uppercase tracking-[0.12em] text-charcoal/55">
        {profile.specialties.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </Section>
  );
}
