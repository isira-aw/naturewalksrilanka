"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

/**
 * A custom listbox rather than a native <select>: the OS dropdown paints its
 * own highlight (system blue on a white sheet) which has nothing to do with the
 * rest of the site. This one is forest-on-stone like every other control here.
 */
export function LocaleSwitcher({
  className,
  label,
  /** "inverted" for the dark footer, where forest green would sink into charcoal. */
  tone = "default",
}: {
  className?: string;
  label?: string;
  tone?: "default" | "inverted";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = params.locale as Locale;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function select(locale: Locale) {
    setOpen(false);
    if (locale === active) return;
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  }

  const inverted = tone === "inverted";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ?? "Language"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-full border py-2 pl-4 pr-3 font-utility text-xs uppercase tracking-wide transition-colors",
          inverted
            ? "border-warm-white/25 text-warm-white hover:border-warm-white/60"
            : "border-stone-dark text-charcoal/80 hover:border-forest hover:text-forest",
          open && !inverted && "border-forest text-forest",
          open && inverted && "border-warm-white/60"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <GlobeIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          {localeNames[active] ?? localeNames.en}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn("shrink-0", inverted ? "text-warm-white/70" : "text-charcoal/45")}
        >
          <svg viewBox="0 0 12 8" className="h-2 w-3" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M1 1.5 6 6.5l5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={label ?? "Language"}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-stone-dark bg-warm-white p-1 shadow-[0_12px_32px_rgba(28,30,27,0.14)]"
          >
            {locales.map((locale) => {
              const isActive = locale === active;
              return (
                <li key={locale}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => select(locale)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left font-utility text-xs uppercase tracking-wide transition-colors",
                      isActive
                        ? "bg-forest text-warm-white"
                        : "text-charcoal/80 hover:bg-forest/10 hover:text-forest"
                    )}
                  >
                    {localeNames[locale]}
                    {isActive && <CheckIcon className="h-3 w-3 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 1.75c1.6 1.7 2.4 3.79 2.4 6.25S9.6 12.55 8 14.25C6.4 12.55 5.6 10.46 5.6 8s.8-4.55 2.4-6.25ZM2 8h12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
