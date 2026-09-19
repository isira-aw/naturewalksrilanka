import { Photo } from "@/components/ui/Photo";
import { Container } from "@/components/ui/Container";

/**
 * The opening frame of a tour page.
 *
 * Deliberately not `PageHero`: that one sets the title *over* a darkened
 * photograph, which is right for a section landing page but fights the
 * editorial reading these pages want. Here the type sits on the cream, at
 * full size, and the photograph arrives underneath it at full width — so the
 * first thing a visitor reads is the journey, and the first thing they look
 * at is the place.
 */
export function TourHero({
  eyebrow,
  title,
  lead,
  meta,
  image,
  actions,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  /** Short facts, set as pills under the lead — duration, focus, style. */
  meta: string[];
  image: { src: string; alt: string };
  actions?: React.ReactNode;
}) {
  return (
    <section className="bg-warm-white pb-14 pt-16 md:pb-20 md:pt-24">
      <Container>
        <p className="font-utility text-[11px] uppercase tracking-[0.22em] text-muted">{eyebrow}</p>

        <h1 className="mt-5 max-w-4xl font-display text-[2.75rem] leading-[0.98] tracking-[-0.03em] text-ink sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          {title}
        </h1>

        {lead && (
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink/75 md:text-xl">{lead}</p>
        )}

        {meta.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {meta.map((item) => (
              <li
                key={item}
                className="rounded-full border border-line bg-white px-4 py-2 text-[13px] text-ink/80"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        {actions && <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">{actions}</div>}

        {/* A fixed aspect rather than a viewport height, so the box the
            photograph lands in is reserved before it loads and nothing below
            it shifts. */}
        <div className="relative mt-12 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone sm:aspect-[16/10] md:mt-14 md:aspect-[21/9] md:rounded-[28px]">
          <Photo src={image.src} alt={image.alt} sizes="100vw" priority />
        </div>
      </Container>
    </section>
  );
}
