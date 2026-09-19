"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type TourNavSection = { id: string; label: string };

/**
 * A secondary way around a long tour page — and deliberately not a second
 * header.
 *
 * The site's own navigation is in the sticky header above and stays the only
 * thing that looks like navigation. This is a column of hairline markers
 * against the right margin on a wide screen: the label for the section you
 * are in, the rest as rules, no bar, no background, no border. On a phone,
 * where there is no margin to put it in, it becomes one small pill above the
 * bottom-right corner — on the opposite side from "back to top", and only
 * after the hero has gone, so it never covers the page it is meant to help
 * with.
 *
 * It is `aria-hidden` for nobody: it is a real `nav` with real anchors, so a
 * keyboard or screen-reader user gets the same shortcuts. It is hidden in
 * print, where nothing can be clicked.
 */
export function TourPageNav({
  sections,
  label,
}: {
  sections: TourNavSection[];
  label: string;
}) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return;

    /* A band across the upper third of the viewport: whichever section is
       crossing it is the one being read. Without the negative bottom margin
       the last, shortest section never wins on a tall screen. */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[visible.length - 1].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setActive(id);
  };

  return (
    <>
      {/* Desktop: in the right margin, vertically centred. */}
      <nav
        aria-label={label}
        className={cn(
          "fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-4 transition-opacity duration-500 xl:flex print:hidden",
          shown ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(event) => go(event, section.id)}
              className="group flex items-center gap-3"
            >
              <span
                className={cn(
                  "font-utility text-[10px] uppercase tracking-[0.18em] transition-all duration-300",
                  isActive
                    ? "text-ink opacity-100"
                    : "text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                )}
              >
                {section.label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "block h-px transition-all duration-300",
                  isActive
                    ? "w-8 bg-ink"
                    : "w-4 bg-ink/30 group-hover:w-8 group-hover:bg-ink/60"
                )}
              />
            </a>
          );
        })}
      </nav>

      {/* Mobile and tablet: dots, not words. A pill wide enough to spell
          "Itinerary · Gallery · Contact" covers a third of a phone screen and
          sits on the text it is meant to help someone read; three dots are
          the same three shortcuts in a thumb-sized object. The label each one
          stands for is still there for anyone who cannot see the dot. */}
      <nav
        aria-label={label}
        className={cn(
          "fixed bottom-5 right-4 z-30 flex items-center gap-0.5 rounded-full border border-line bg-white/90 px-1.5 py-1.5 shadow-[0_2px_12px_rgba(76,77,73,0.12)] backdrop-blur transition-opacity duration-500 xl:hidden print:hidden",
          shown ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => go(event, section.id)}
            /* A 40px tap target around a 7px dot: big enough to hit, small
               enough not to be a bar. */
            className="flex h-10 w-10 items-center justify-center rounded-full"
          >
            <span
              aria-hidden="true"
              className={cn(
                "block h-[7px] w-[7px] rounded-full transition-colors duration-300",
                active === section.id ? "bg-ink" : "bg-ink/25"
              )}
            />
            <span className="sr-only">{section.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
