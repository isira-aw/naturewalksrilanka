import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Profile } from "@/lib/content/schema";
import { Section } from "@/components/ui/Section";

/**
 * Home-page version of "who is Nandana": the founder and lead guide behind the
 * company, in short. The full story stays on the About page.
 */
export function GuideIntro({
  profile,
  labels,
}: {
  profile: Profile;
  labels: { eyebrow: string; role: string; body: string; cta: string };
}) {
  return (
    <Section tone="stone">
      <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm md:col-span-5">
          <Image
            src={profile.portraitImage}
            alt={`Portrait of ${profile.name} in the field`}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="md:col-span-7">
          <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
            {labels.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
            {profile.name}
          </h2>
          <p className="mt-2 font-utility text-xs uppercase tracking-[0.12em] text-charcoal/55">
            {labels.role}
          </p>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal/75">{labels.body}</p>

          <p className="mt-8 max-w-xl border-l-2 border-forest pl-5 font-display text-xl leading-relaxed text-charcoal/80">
            {profile.philosophy}
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-utility text-xs uppercase tracking-[0.12em] text-charcoal/55">
            <li>{profile.experience}</li>
            <li>{profile.certification}</li>
          </ul>

          <Link
            href="/about-nandana"
            className="mt-8 inline-block font-medium text-forest underline underline-offset-8 transition-colors hover:text-forest-dark"
          >
            {labels.cta}
          </Link>
        </div>
      </div>
    </Section>
  );
}
