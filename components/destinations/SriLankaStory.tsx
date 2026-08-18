import Image from "next/image";
import { Link } from "@/i18n/navigation";

export function SriLankaStory({
  labels,
}: {
  labels: { eyebrow: string; title: string; body: string; cta: string };
}) {
  return (
    <section className="bg-warm-white py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-2 px-6 md:grid-cols-3 md:px-10">
        <div className="relative aspect-[3/4] overflow-hidden md:col-span-1">
          <Image src="/images/story-1.jpg" alt="Wilpattu dry-zone landscape" fill sizes="33vw" className="object-cover" />
        </div>
        <div className="relative col-span-1 mt-8 aspect-[3/4] overflow-hidden md:mt-16">
          <Image src="/images/story-2.jpg" alt="Sinharaja rainforest canopy" fill sizes="33vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center px-2 py-8 md:col-span-1 md:py-0">
          <p className="mb-3 font-utility text-xs uppercase tracking-[0.2em] text-forest">
            {labels.eyebrow}
          </p>
          <h2 className="font-display text-3xl leading-tight text-charcoal md:text-4xl">
            {labels.title}
          </h2>
          <p className="mt-5 text-charcoal/75">{labels.body}</p>
          <Link href="/destinations" className="mt-6 font-medium text-forest underline underline-offset-4">
            {labels.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
