"use client";

import { Photo } from "@/components/ui/Photo";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { ArrowLabel, Kicker, Rise, Words, viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One way of spending a day on the island, built from `activities.json` — the
 * chapter between "here are our journeys" and "here are the places", so a
 * visitor who came looking for birds or for a camera rather than for a
 * duration sees themselves on the page.
 *
 * The photograph and the link are a real destination that lists this activity,
 * resolved on the server (see the home page): nothing here invents an image,
 * and the card is also the site's densest patch of internal linking into the
 * destination pages.
 */
export type ActivityCard = {
  slug: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  place?: { slug: string; name: string };
};

export function ActivityShowcase({
  items,
  labels,
}: {
  items: ActivityCard[];
  labels: { eyebrow: string; title: string; body: string; where: string };
}) {
  if (items.length === 0) return null;

  return (
    <section className="bg-warm-white py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Kicker>{labels.eyebrow}</Kicker>
            <Words
              text={labels.title}
              delay={0.05}
              className="mt-6 max-w-xl font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
            />
          </div>
          <div className="md:col-span-5 md:pt-3">
            <Rise delay={0.15}>
              <p className="leading-relaxed text-charcoal/70">{labels.body}</p>
            </Rise>
          </div>
        </div>

        <ul className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <motion.li
              key={item.slug}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.8, ease: EASE, delay: (index % 3) * 0.08 }}
              className="group"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <Photo
                  src={item.image}
                  alt={item.imageAlt}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 100vw"
                  className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/10 to-transparent" />
                <h3 className="absolute inset-x-6 bottom-5 font-display text-2xl leading-tight text-warm-white">
                  {item.name}
                </h3>
              </div>

              <p className="mt-6 leading-relaxed text-charcoal/65">{item.description}</p>

              {item.place && (
                <p className="mt-5 border-t border-charcoal/15 pt-4">
                  <span className="block font-utility text-[11px] uppercase tracking-[0.2em] text-charcoal/40">
                    {labels.where}
                  </span>
                  {/* Its own `group`, nearer than the card's, so the arrow and
                      the rule answer the link rather than the whole tile. */}
                  <Link
                    href={`/destinations/${item.place.slug}`}
                    className="group mt-2 inline-flex items-center gap-3 font-utility text-xs uppercase tracking-[0.2em] text-forest transition-colors hover:text-forest-dark"
                  >
                    <ArrowLabel>{item.place.name}</ArrowLabel>
                  </Link>
                </p>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
