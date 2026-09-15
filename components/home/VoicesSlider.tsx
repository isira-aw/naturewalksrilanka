"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Testimonials } from "@/lib/content/schema";
import { CarouselButton, Kicker, Words } from "@/components/ui/motion";
import { Photo } from "@/components/ui/Photo";
import { Lightbox, type LightboxLabels } from "@/components/ui/Lightbox";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Long enough to read a short quote, short enough that nobody waits. */
const ADVANCE_MS = 3000;
const SLIDE_MS = 600;

/**
 * Traveller quotes as a rotating rail of cards: one at a time on a phone, two
 * side by side from tablet up, moving on by itself every few seconds and
 * wrapping round at the end.
 *
 * The rail is built from the list twice over. Moving past the last card lands
 * on the copy of the first, and the moment that transition finishes the
 * position jumps back to the real one with the animation switched off — which
 * is what makes the wrap invisible rather than a rewind across the screen.
 *
 * It stops while somebody is reading: hovering, tabbing into it, or opening a
 * photograph all pause it, and it never starts at all for a visitor who has
 * asked for reduced motion. The arrows work regardless.
 *
 * A review left through the form usually arrives with the traveller's own
 * photographs. They sit under the quote and open full size, because a leopard
 * somebody photographed on their own trip is worth more to the next traveller
 * than the sentence describing it.
 */
export function VoicesSlider({
  testimonials,
  labels,
}: {
  testimonials: Testimonials;
  labels: { eyebrow: string; title: string; emptyState: string; gallery: LightboxLabels };
}) {
  const items = testimonials.items;
  const count = items.length;
  const rotates = count > 1;

  /* Position along the doubled rail: 0…count, where `count` is the copy of the
     first card that the wrap passes through. */
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);
  /** Which card's photographs are open, and which of them. */
  const [viewing, setViewing] = useState<{ card: number; photo: number } | null>(null);
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLUListElement>(null);
  /* The CSS decides how many cards fit; this only needs to know the same
     number, so the cards nobody can see are also out of the tab order. */
  const perView = useTwoUp() && rotates ? 2 : 1;

  const slides = rotates ? [...items, ...items] : items;
  const current = count > 0 ? index % count : 0;
  const open = viewing !== null;

  /* Moving on by itself. Re-armed on every change of position, so a manual
     press also gets the full few seconds before the next one. */
  useEffect(() => {
    if (!rotates || paused || open || reducedMotion || !animating) return;
    const timer = window.setTimeout(() => setIndex((position) => position + 1), ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [rotates, paused, open, reducedMotion, animating, index]);

  /* Re-enables the animation a frame after a silent jump, so the jump itself
     is never animated but the next move is. */
  useEffect(() => {
    if (animating) return;
    const frame = window.requestAnimationFrame(() => setAnimating(true));
    return () => window.cancelAnimationFrame(frame);
  }, [animating]);

  function move(step: 1 | -1) {
    setViewing(null);
    if (!rotates) return;

    if (step === 1 || index > 0) {
      setIndex(index + step);
      return;
    }

    /* Going back from the first card: stand on the copy at the far end
       without animating, then slide into the last card from there. */
    setAnimating(false);
    setIndex(count);
    window.requestAnimationFrame(() => setIndex(count - 1));
  }

  function onSettled(event: React.TransitionEvent<HTMLUListElement>) {
    // Only the rail's own slide counts; a hover inside a card also bubbles.
    if (event.target !== trackRef.current || event.propertyName !== "transform") return;
    if (index >= count) {
      setAnimating(false);
      setIndex(index - count);
    }
  }

  const railStyle: CSSProperties = {
    ["--index" as string]: index,
    transform: "translateX(calc(var(--index) * -100% / var(--per-view)))",
    transition: animating && !reducedMotion ? `transform ${SLIDE_MS}ms cubic-bezier(0.16,1,0.3,1)` : "none",
  };

  return (
    <section className="bg-stone py-14 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Kicker>{labels.eyebrow}</Kicker>
            <Words
              text={labels.title}
              delay={0.05}
              className="mt-4 font-display text-2xl leading-tight tracking-tight text-charcoal md:text-3xl"
            />
          </div>

          {rotates && (
            <div className="flex items-center gap-3">
              <CarouselButton direction="prev" label="Previous testimonial" onClick={() => move(-1)} />
              <CarouselButton direction="next" label="Next testimonial" onClick={() => move(1)} />
            </div>
          )}
        </div>

        {count === 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="mt-10 max-w-md text-charcoal/60"
          >
            {labels.emptyState}
          </motion.p>
        ) : (
          <div
            className="mt-8 border-t border-charcoal/15 pt-8"
            role="group"
            aria-roledescription="carousel"
            aria-label={labels.title}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div className="overflow-hidden">
              <ul
                ref={trackRef}
                onTransitionEnd={onSettled}
                style={railStyle}
                /* One card per view on a phone; two from tablet up, which is
                   what the width is for. Both the card width and the distance
                   moved come off this one variable. */
                /* No negative margin: the rail has to be exactly as wide as
                   what is on screen, or the cards either side of it show
                   through at the edges. The gap comes from the cards' own
                   padding instead. */
                className={`flex ${
                  rotates ? "[--per-view:1] md:[--per-view:2]" : "[--per-view:1]"
                }`}
              >
                {slides.map((item, position) => (
                  <li
                    key={`${item.author}-${position}`}
                    inert={position < index || position >= index + perView}
                    className="w-[calc(100%/var(--per-view))] shrink-0 px-2"
                  >
                    <figure className="flex h-full flex-col rounded-2xl border border-charcoal/10 bg-warm-white p-6 md:p-7">
                      {/* Only reviews left through the review form carry a
                          rating; the hand-written entries in `content/` have
                          none, and inventing one would be a lie. */}
                      {typeof item.rating === "number" && (
                        <p
                          className="mb-4 text-sm tracking-[0.2em] text-forest"
                          aria-label={`${item.rating} out of 5`}
                        >
                          <span aria-hidden="true">
                            {"★".repeat(item.rating)}
                            {"☆".repeat(5 - item.rating)}
                          </span>
                        </p>
                      )}

                      <blockquote className="font-display text-lg leading-relaxed text-charcoal md:text-xl md:leading-[1.5]">
                        &ldquo;{item.quote}&rdquo;
                      </blockquote>

                      <figcaption className="mt-5 font-utility text-[11px] uppercase tracking-[0.2em] text-forest">
                        {item.author}
                        {item.country ? ` · ${item.country}` : ""}
                      </figcaption>

                      {item.photos.length > 0 && (
                        <ul className="mt-5 flex flex-wrap gap-2.5">
                          {item.photos.map((src, photo) => (
                            <li key={src}>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewing({ card: position % count, photo })
                                }
                                aria-label={`${labels.gallery.label}: ${item.author}`}
                                className="group relative block h-16 w-20 overflow-hidden rounded-lg bg-charcoal/10 sm:h-[4.5rem] sm:w-24"
                              >
                                <Photo
                                  src={src}
                                  alt=""
                                  sizes="6rem"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </figure>
                  </li>
                ))}
              </ul>
            </div>

            {rotates && (
              <div className="mt-7 flex items-center gap-3">
                {items.map((item, position) => (
                  <button
                    key={item.author}
                    type="button"
                    onClick={() => {
                      setViewing(null);
                      setIndex(position);
                    }}
                    aria-label={`Show testimonial ${position + 1} of ${count}`}
                    aria-current={position === current}
                    className="group py-3"
                  >
                    <span
                      className={
                        position === current
                          ? "block h-px w-12 bg-forest transition-all duration-500"
                          : "block h-px w-6 bg-charcoal/25 transition-all duration-500 group-hover:bg-charcoal/50"
                      }
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* The photographs of whichever card was clicked. The rail is paused
          while this is open, so the picture and the words never disagree. */}
      <Lightbox
        images={(viewing ? items[viewing.card].photos : []).map((src) => ({
          src,
          title: viewing ? items[viewing.card].author : undefined,
        }))}
        index={viewing?.photo ?? null}
        labels={labels.gallery}
        onIndexChange={(photo) => setViewing((open) => (open ? { ...open, photo } : open))}
        onClose={() => setViewing(null)}
      />
    </section>
  );
}

/** True from the tablet breakpoint up, where two cards are shown at once. */
function useTwoUp() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    /* One card until the client says otherwise: the markup the server sends
       is the phone's, and hydration corrects it. */
    () => false,
  );
}
