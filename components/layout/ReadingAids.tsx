"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";

/**
 * Two small scroll affordances, in one component because they share a
 * listener and neither is big enough to own a file.
 *
 * Both sit above the page in a fixed layer and are `aria-hidden` /
 * decorative-by-default: the progress bar duplicates the scrollbar the
 * browser already draws, and "back to top" duplicates the Home key. They are
 * presentation, so nothing here is announced twice to a screen reader — but
 * the button is a real focusable `button`, because someone navigating by
 * keyboard on a long destination page benefits from it most.
 *
 * `MotionConfig reducedMotion="user"` in `MotionProvider` already makes
 * framer-motion respect prefers-reduced-motion, so the spring below flattens
 * to an instant update for anyone who asked for that.
 */
export function ReadingAids() {
  return (
    <>
      <ScrollProgress />
      <BackToTop />
    </>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  /* Springing the raw value stops the bar jittering on trackpads, which
     report many small deltas per frame. */
  const width = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.2 });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: width }}
      /* z-40 matches the sticky header, and this is rendered after it, so it
         paints on top of the header while the z-50 mobile nav and language
         dialog still cover it. */
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 origin-left bg-forest print:hidden"
    />
  );
}

function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* Two viewports down is roughly "past the hero and committed to reading",
       which is the first point the button is worth the pixels. */
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 left-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-stone-dark bg-warm-white/90 text-charcoal shadow-[0_2px_12px_rgba(28,30,27,0.12)] backdrop-blur transition-colors hover:border-forest hover:text-forest print:hidden"
        >
          <svg viewBox="0 0 12 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M6 13V2M1.5 6.5 6 2l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
