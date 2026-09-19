import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";

/**
 * How the page ends: the invitation on the left, the ways to take it up on
 * the right. A white band on the cream rather than the site's photographic
 * closing panel, so the tour page finishes the way it read — quietly, with
 * the photography already behind it.
 *
 * All three routes in are the ones the site already has: WhatsApp with the
 * tour named in the message, the operator's own address, and the custom-tour
 * wizard for anyone who wants this journey rearranged.
 */
export function TourCta({
  whatsappNumber,
  whatsappMessage,
  email,
  labels,
}: {
  whatsappNumber: string;
  whatsappMessage: string;
  email: string;
  labels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    whatsappCta: string;
    emailCta: string;
    customizeCta: string;
  };
}) {
  return (
    <section
      id="contact"
      className="scroll-mt-24 border-y border-line bg-white py-20 md:py-24"
    >
      <Container>
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between md:gap-16">
          <div className="max-w-2xl">
            <p className="font-utility text-[11px] uppercase tracking-[0.22em] text-muted">
              {labels.eyebrow}
            </p>
            <h2 className="mt-4 font-display text-3xl leading-[1.05] tracking-[-0.03em] text-ink md:text-[2.75rem]">
              {labels.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">{labels.subtitle}</p>
          </div>

          {/* No `shrink-0` here: in the `md:flex-row` above it would stop the
              row shrinking, and three buttons then overflow the page
              sideways rather than wrapping. */}
          <div className="flex flex-wrap items-center gap-3">
            <WhatsAppCTA phone={whatsappNumber} message={whatsappMessage} variant="primary" size="md">
              {labels.whatsappCta}
            </WhatsAppCTA>
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-forest hover:text-forest"
            >
              {labels.emailCta}
            </a>
            <Link
              href="/custom-tour"
              className="inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-forest hover:text-forest"
            >
              {labels.customizeCta}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
