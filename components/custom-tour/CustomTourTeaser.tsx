import Image from "next/image";
import { Link } from "@/i18n/navigation";

export function CustomTourTeaser({
  labels,
}: {
  labels: { eyebrow: string; titleLine1: string; titleLine2: string; intro: string; start: string };
}) {
  return (
    <section className="relative overflow-hidden bg-forest py-24 text-warm-white md:py-32">
      <Image
        src="/images/hero-2.jpg"
        alt="A quiet trail through Sri Lankan forest"
        fill
        sizes="100vw"
        className="object-cover opacity-20"
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center md:px-10">
        <p className="mb-3 font-utility text-xs uppercase tracking-[0.2em] text-warm-white/70">
          {labels.eyebrow}
        </p>
        <h2 className="font-display text-4xl leading-tight md:text-6xl">
          {labels.titleLine1}
          <br />
          {labels.titleLine2}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-warm-white/85">{labels.intro}</p>
        <Link
          href="/custom-tour"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-warm-white px-8 py-4 font-medium text-forest transition-colors hover:bg-stone"
        >
          {labels.start}
        </Link>
      </div>
    </section>
  );
}
