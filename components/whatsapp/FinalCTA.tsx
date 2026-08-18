import { WhatsAppCTA } from "./WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";

export function FinalCTA({
  whatsappNumber,
  labels,
}: {
  whatsappNumber: string;
  labels: { eyebrow: string; title: string; subtitle: string; cta: string };
}) {
  return (
    <section className="bg-forest py-24 text-center text-warm-white md:py-32">
      <div className="mx-auto max-w-2xl px-6 md:px-10">
        <p className="mb-3 font-utility text-xs uppercase tracking-[0.2em] text-warm-white/70">
          {labels.eyebrow}
        </p>
        <h2 className="font-display text-4xl leading-tight md:text-5xl">{labels.title}</h2>
        <p className="mt-4 text-warm-white/85">{labels.subtitle}</p>
        <div className="mt-10 flex justify-center">
          <WhatsAppCTA
            phone={whatsappNumber}
            message={buildGeneralMessage()}
            variant="inverted"
            size="lg"
          >
            {labels.cta}
          </WhatsAppCTA>
        </div>
      </div>
    </section>
  );
}
