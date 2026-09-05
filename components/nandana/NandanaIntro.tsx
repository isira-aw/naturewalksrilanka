import Image from "next/image";
import type { Profile } from "@/lib/content/schema";
import { Section } from "@/components/ui/Section";
import { StatCounter } from "./StatCounter";

export function NandanaIntro({
  profile,
  eyebrow,
  title,
}: {
  profile: Profile;
  /** Omit where the surrounding page has already introduced him. */
  eyebrow?: string;
  title: string;
}) {
  return (
    <Section tone="warm">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm md:order-2">
          <Image
            src={profile.portraitImage}
            alt={`Portrait of ${profile.name} in the field`}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="md:order-1">
          {eyebrow && (
            <p className="mb-4 font-utility text-xs uppercase tracking-[0.2em] text-forest">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
            {title}
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-charcoal/75">
            {profile.story}
          </p>

          <div className="mt-10">
            <StatCounter stats={profile.stats} />
          </div>
        </div>
      </div>
    </Section>
  );
}
