import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The first thing after the hero: one calm line answering "what is this?"
 * before the visitor is asked to do anything. The numbers underneath it carry
 * the detail that used to be a paragraph.
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
    <Section tone="warm" size="compact">
      <Reveal className="max-w-3xl">
        <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">{eyebrow}</p>
        <h2 className="mt-5 font-display text-3xl leading-[1.15] tracking-tight text-charcoal md:text-[2.75rem]">
          {title}
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-charcoal/70">{body}</p>
      </Reveal>
    </Section>
  );
}
