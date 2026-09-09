"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Experience } from "@/lib/content/schema";

export type ExperienceLabels = {
  readMore: string;
  close: string;
  add: string;
  added: string;
  location: string;
  bestTime: string;
  duration: string;
  highlights: string;
};

/**
 * Everything about one prebuilt itinerary — photographs, season, length and the
 * species or sights you might see — in a dialog, so the wizard step itself
 * stays a short list of boxes rather than a wall of detail.
 *
 * The dialog is deliberately large: on a phone it is a full-height sheet, and
 * on a laptop it uses most of the window, because the photographs are the
 * point of it.
 */
export function ExperienceDialog({
  experience,
  labels,
  selected,
  onToggle,
  onClose,
}: {
  experience: Experience | null;
  labels: ExperienceLabels;
  selected: boolean;
  onToggle: (slug: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!experience) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [experience, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {experience && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-0 backdrop-blur-sm sm:items-center sm:p-6 lg:p-8"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="experience-dialog-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
            /* Phone: a sheet that all but fills the screen, so the photographs
               are worth looking at. Laptop: most of the window, capped so the
               text lines never run too long to read. */
            className="flex h-[94dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl bg-warm-white sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl lg:max-w-5xl xl:max-w-6xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-dark px-5 py-4 sm:px-7 sm:py-5">
              <div className="min-w-0">
                <p className="font-utility text-[11px] uppercase tracking-wide text-forest">
                  {experience.location}
                </p>
                <h2
                  id="experience-dialog-title"
                  className="mt-1 font-display text-xl leading-snug text-charcoal sm:text-2xl lg:text-3xl"
                >
                  {experience.title}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={labels.close}
                className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-charcoal/60 transition-colors hover:bg-stone hover:text-charcoal"
              >
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5 sm:px-7 lg:px-9">
              {/* Photographs and the write-up side by side once there is room;
                  stacked on a phone, where the gallery leads. */}
              <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {experience.images.map((src, index) => (
                    <div
                      key={src + index}
                      className={cn(
                        "relative overflow-hidden rounded-xl bg-stone",
                        index === 0 ? "aspect-[16/10]" : "aspect-[4/3]"
                      )}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 32rem, (min-width: 640px) 20rem, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 lg:mt-0">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Fact label={labels.bestTime} value={experience.bestTime} />
                    <Fact label={labels.duration} value={experience.duration} />
                  </dl>

                  <p className="mt-6 leading-relaxed text-charcoal/75">{experience.description}</p>

                  {experience.highlights.length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
                        {labels.highlights}
                      </h3>
                      {/* Photograph cards rather than a list: what you might see
                          is the reason to pick one itinerary over another. A
                          highlight whose photograph has not been supplied yet
                          keeps its place in the grid — see
                          public/images/highlights/README.md. */}
                      <ul className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-3">
                        {experience.highlights.map((highlight) => (
                          <li
                            key={highlight.name}
                            className="overflow-hidden rounded-xl border border-stone-dark bg-warm-white"
                          >
                            <div className="relative aspect-[4/3] bg-stone">
                              {highlight.image ? (
                                <Image
                                  src={highlight.image}
                                  alt={highlight.name}
                                  fill
                                  sizes="(min-width: 1024px) 14rem, 45vw"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-stone/70">
                                  <span className="font-display text-3xl text-charcoal/25">
                                    {highlight.name.slice(0, 1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-3">
                              <p className="text-sm font-medium leading-snug text-charcoal">
                                {highlight.name}
                              </p>
                              {highlight.note && (
                                <p className="mt-1 text-xs leading-relaxed text-charcoal/55">
                                  {highlight.note}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stone-dark px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
              <button
                type="button"
                onClick={() => onToggle(experience.slug)}
                aria-pressed={selected}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-6 font-medium transition-colors sm:w-auto",
                  selected
                    ? "border-forest bg-forest text-warm-white hover:bg-forest-dark"
                    : "border-forest text-forest hover:bg-forest hover:text-warm-white"
                )}
              >
                {selected && (
                  <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3 w-3" aria-hidden="true">
                    <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {selected ? labels.added : labels.add}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone/60 px-4 py-3">
      <dt className="font-utility text-[10px] uppercase tracking-wide text-charcoal/50">{label}</dt>
      <dd className="mt-0.5 text-sm text-charcoal">{value}</dd>
    </div>
  );
}
