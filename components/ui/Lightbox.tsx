"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Photo } from "./Photo";

export type LightboxImage = {
  src: string;
  /** The species or the place, where one is known: shown under the picture. */
  title?: string;
  note?: string;
  blurDataURL?: string;
};

export type LightboxLabels = {
  /** Names the dialog for a screen reader, e.g. "Photographs". */
  gallery: string;
  close: string;
  previous: string;
  next: string;
};

/**
 * Any set of photographs, full size, one at a time.
 *
 * The site is mostly photography shown small — thumbnails in a dialog, a strip
 * of highlights, a stop in a plan — and a leopard in a 200 px box is not worth
 * looking at. Every one of those grids can hand its pictures to this and become
 * something a traveller can actually open.
 *
 * The index lives with the caller, so the grid decides which picture opens and
 * this only moves between them: arrow keys, the buttons, or a swipe on a phone.
 */
export function Lightbox({
  images,
  index,
  labels,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[];
  /** The picture on screen, or null when the lightbox is closed. */
  index: number | null;
  labels: LightboxLabels;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null && index >= 0 && index < images.length;
  const current = open ? images[index] : null;

  const step = useCallback(
    (delta: number) => {
      if (index === null || images.length < 2) return;
      onIndexChange((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    /* Captured, so the dialog underneath does not also close on Escape: the
       traveller asked to leave the photograph, not the itinerary. */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      } else if (event.key === "ArrowRight") {
        step(1);
      } else if (event.key === "ArrowLeft") {
        step(-1);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose, step]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && current && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={labels.gallery}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          /* Above the itinerary dialog, which sits at z-50. */
          className="fixed inset-0 z-[60] flex flex-col bg-charcoal/95 backdrop-blur-sm"
          onClick={onClose}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="font-utility text-xs tracking-wide text-warm-white/70">
              {index + 1} / {images.length}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-warm-white/80 transition-colors hover:bg-warm-white/10 hover:text-warm-white"
            >
              <svg viewBox="0 0 14 14" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-4 sm:px-16">
            {images.length > 1 && (
              <Arrow
                direction="previous"
                label={labels.previous}
                onClick={() => step(-1)}
              />
            )}

            {/* Keyed on the source so the picture, not the frame, animates —
                and so a swipe always starts from the middle again. */}
            <AnimatePresence mode="wait">
              <motion.figure
                key={current.src}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onClick={(event) => event.stopPropagation()}
                drag={images.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) step(1);
                  else if (info.offset.x > 80) step(-1);
                }}
                /* A definite height, so the picture below can take what is
                   left of it: a flex child centred by its parent is only as
                   tall as its content, which leaves an image nothing to fill. */
                className="flex h-full w-full max-w-5xl flex-col items-center justify-center"
              >
                <div className="relative w-full min-h-0 flex-1">
                  <Photo
                    src={current.src}
                    alt={current.title ?? ""}
                    sizes="100vw"
                    className="object-contain"
                    blurDataURL={current.blurDataURL}
                  />
                </div>

                {(current.title || current.note) && (
                  <figcaption className="mt-3 max-w-2xl px-2 text-center">
                    {current.title && (
                      <p className="text-sm font-medium text-warm-white">{current.title}</p>
                    )}
                    {current.note && (
                      <p className="mt-1 text-xs leading-relaxed text-warm-white/65">
                        {current.note}
                      </p>
                    )}
                  </figcaption>
                )}
              </motion.figure>
            </AnimatePresence>

            {images.length > 1 && (
              <Arrow direction="next" label={labels.next} onClick={() => step(1)} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Arrow({
  direction,
  label,
  onClick,
}: {
  direction: "previous" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-charcoal/60 text-warm-white/85 transition-colors hover:bg-charcoal hover:text-warm-white ${
        direction === "previous" ? "left-1 sm:left-4" : "right-1 sm:right-4"
      }`}
    >
      <svg viewBox="0 0 10 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path
          d={direction === "previous" ? "M8.5 1 1.5 8l7 7" : "M1.5 1l7 7-7 7"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
