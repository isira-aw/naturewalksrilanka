import { Section } from "@/components/ui/Section";

/**
 * The first thing after the hero: one calm paragraph answering
 * "what is this?" before the visitor is asked to do anything.
 */
export function HomeIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Section tone="warm" size="spacious">
      <div className="max-w-3xl">
        <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">{eyebrow}</p>
        <h2 className="mt-5 font-display text-3xl leading-[1.15] tracking-tight text-charcoal md:text-[2.75rem]">
          {title}
        </h2>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-charcoal/70">{body}</p>
      </div>
    </Section>
  );
}
