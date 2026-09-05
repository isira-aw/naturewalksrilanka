import { Link } from "@/i18n/navigation";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";

export function FinalCTA({
  whatsappNumber,
  labels,
  secondary,
}: {
  whatsappNumber: string;
  labels: { eyebrow: string; title: string; subtitle: string; cta: string };
  /** Optional second route into planning, e.g. the custom-tour wizard. */
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="bg-forest py-24 text-center text-warm-white md:py-32">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 md:px-10">
        <p className="font-utility text-xs uppercase tracking-[0.2em] text-warm-white/70">
          {labels.eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight md:text-5xl">
          {labels.title}
        </h2>
        <p className="mx-auto mt-5 max-w-lg leading-relaxed text-warm-white/80">
          {labels.subtitle}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <WhatsAppCTA
            phone={whatsappNumber}
            message={buildGeneralMessage()}
            variant="inverted"
            size="lg"
          >
            {labels.cta}
          </WhatsAppCTA>
          {secondary && (
            <Link
              href={secondary.href}
              className="font-medium text-warm-white/90 underline decoration-warm-white/40 underline-offset-8 transition-colors hover:text-warm-white hover:decoration-warm-white"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
