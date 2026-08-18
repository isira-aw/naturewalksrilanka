import type { Profile } from "@/lib/content/schema";
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
    <section className="bg-stone py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeading eyebrow={eyebrow} title={title} align="center" className="mx-auto max-w-2xl" />

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {points.map((point, i) => (
            <div key={point.title} className="border-t-2 border-forest pt-6">
              <span className="font-utility text-xs text-forest">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-2xl text-charcoal">{point.title}</h3>
              <p className="mt-3 text-charcoal/75">{point.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-3">
          {profile.specialties.map((s) => (
            <span
              key={s}
              className="rounded-full border border-forest/30 bg-warm-white px-4 py-2 text-sm text-forest"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
