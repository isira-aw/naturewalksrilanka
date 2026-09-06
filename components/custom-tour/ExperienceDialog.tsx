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
 * Everything about one prebuilt idea — photographs, season, length and the
 * species or sights you might see — in a dialog, so the wizard step itself
 * stays a short list of boxes rather than a wall of detail.
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
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
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-warm-white sm:max-h-[86vh] sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-dark px-5 py-4 sm:px-7">
              <div className="min-w-0">
                <p className="font-utility text-[11px] uppercase tracking-wide text-forest">
                  {experience.location}
                </p>
                <h2
                  id="experience-dialog-title"
                  className="mt-1 font-display text-xl text-charcoal sm:text-2xl"
                >
                  {experience.title}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={labels.close}
                className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-charcoal/60 transition-colors hover:bg-stone hover:text-charcoal"
              >
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-7 pt-5 sm:px-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {experience.images.map((src, index) => (
                  <div
                    key={src + index}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 20rem, 100vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <Fact label={labels.bestTime} value={experience.bestTime} />
                <Fact label={labels.duration} value={experience.duration} />
              </dl>

              <p className="mt-6 leading-relaxed text-charcoal/75">{experience.description}</p>

              {experience.highlights.length > 0 && (
                <div className="mt-7">
                  <h3 className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
                    {labels.highlights}
                  </h3>
                  <ul className="mt-3 divide-y divide-stone-dark border-y border-stone-dark">
                    {experience.highlights.map((highlight) => (
                      <li key={highlight.name} className="flex items-center gap-4 py-3">
                        {/* A highlight photo is optional — the client's own bird
                            photographs drop in here without a layout change. */}
                        {highlight.image && (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone">
                            <Image
                              src={highlight.image}
                              alt=""
                              fill
                              sizes="3.5rem"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-charcoal">{highlight.name}</p>
                          {highlight.note && (
                            <p className="mt-0.5 text-sm text-charcoal/55">{highlight.note}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stone-dark px-5 py-4 sm:px-7">
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
