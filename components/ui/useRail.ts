"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";

/**
 * Drives the horizontal card rails the reference site uses for its island and
 * experience rows. The rail itself is a native scroll container — so a
 * trackpad, a touch swipe and a keyboard all work without any custom gesture
 * handling — and this hook adds the chrome around it: arrow state and a
 * progress bar tracking how far along the rail you are.
 */
export function useRail() {
  const ref = useRef<HTMLDivElement>(null);
  /* Progress is a motion value rather than state: it changes on every scroll
     frame, and driving the bar directly keeps the cards out of the re-render. */
  const progress = useMotionValue(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // A rail shorter than its container has nothing to scroll; report it full.
    progress.set(max > 8 ? el.scrollLeft / max : 1);
    setCanPrev(el.scrollLeft > 8);
    setCanNext(max > 8 && el.scrollLeft < max - 8);
  }, [progress]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [sync]);

  /** Steps by one card, measured from the first child so it stays in sync
      whatever the card width is at this breakpoint. */
  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }, []);

  return { ref, progress, canPrev, canNext, scrollByCard };
}
