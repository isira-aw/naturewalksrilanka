export function ConservationSection({
  labels,
}: {
  labels: { eyebrow: string; title: string; quote: string };
}) {
  return (
    <section className="bg-charcoal py-24 text-warm-white md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
        <p className="mb-4 font-utility text-xs uppercase tracking-[0.2em] text-warm-white/60">
          {labels.eyebrow}
        </p>
        <h2 className="font-display text-3xl leading-tight md:text-4xl">{labels.title}</h2>
        <p className="mt-6 text-lg leading-relaxed text-warm-white/80">{labels.quote}</p>
      </div>
    </section>
  );
}
