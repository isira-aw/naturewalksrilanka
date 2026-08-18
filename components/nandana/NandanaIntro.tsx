import Image from "next/image";
import type { Profile } from "@/lib/content/schema";
import { StatCounter } from "./StatCounter";

export function NandanaIntro({
  profile,
  eyebrow,
  title,
}: {
  profile: Profile;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="bg-warm-white py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 md:grid-cols-2 md:px-10">
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
          <p className="mb-3 font-utility text-xs uppercase tracking-[0.2em] text-forest">
            {eyebrow}
          </p>
          <h2 className="font-display text-4xl leading-tight text-charcoal md:text-5xl">
            {title}
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-charcoal/80">
            {profile.story}
          </p>
          <p className="mt-6 max-w-lg italic text-charcoal/70">“{profile.philosophy}”</p>
          <p className="mt-2 font-utility text-xs uppercase tracking-wide text-charcoal/50">
            {profile.name} · {profile.certification}
          </p>

          <div className="mt-10">
            <StatCounter stats={profile.stats} />
          </div>
        </div>
      </div>
    </section>
  );
}
