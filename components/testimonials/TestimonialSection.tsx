import type { Testimonials } from "@/lib/content/schema";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function TestimonialSection({
  testimonials,
  labels,
}: {
  testimonials: Testimonials;
  labels: { eyebrow: string; title: string; emptyState: string };
}) {
  return (
    <section className="bg-stone py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeading eyebrow={labels.eyebrow} title={labels.title} align="center" className="mx-auto max-w-2xl" />

        {testimonials.items.length === 0 ? (
          <p className="mx-auto mt-12 max-w-md text-center text-charcoal/60">
            {labels.emptyState}
          </p>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.items.map((item) => (
              <blockquote key={item.author} className="rounded-sm bg-warm-white p-8">
                <p className="text-charcoal/80">“{item.quote}”</p>
                <footer className="mt-4 font-utility text-xs uppercase tracking-wide text-forest">
                  {item.author}
                  {item.country ? ` · ${item.country}` : ""}
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
