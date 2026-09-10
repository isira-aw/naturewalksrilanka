"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

/**
 * A country, not a language — "English" tells a visitor nothing about which
 * flag they're looking at, so each locale maps to the market it represents.
 * `iso` is the flagcdn.com country code: flag emoji don't render as pictures
 * on Windows (most browsers there fall back to the two-letter code), so the
 * flag is a real SVG image instead.
 */
const localeCountries: Record<Locale, { name: string; iso: string }> = {
  en: { name: "United Kingdom", iso: "gb" },
  nl: { name: "Netherlands", iso: "nl" },
  es: { name: "Spain", iso: "es" },
  da: { name: "Denmark", iso: "dk" },
  fi: { name: "Finland", iso: "fi" },
};

function FlagIcon({ iso, className }: { iso: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/${iso}.svg`}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}

/**
 * The trigger is a small pill button; opening it launches a full-screen
 * modal grid of markets (flag + country) rather than a dropdown, so it reads
 * the same on a phone as on a 1920px desktop.
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const active = params.locale as Locale;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
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
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ?? "Language"}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-full border py-2 pl-4 pr-3 font-utility text-xs uppercase tracking-wide transition-colors",
          inverted
            ? "border-warm-white/25 text-warm-white hover:border-warm-white/60"
            : "border-stone-dark text-charcoal/80 hover:border-forest hover:text-forest",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <FlagIcon iso={(localeCountries[active] ?? localeCountries.en).iso} className="h-3.5 w-3.5" />
          {(localeCountries[active] ?? localeCountries.en).name}
        </span>
        <svg
          viewBox="0 0 12 8"
          className={cn("h-2 w-3 shrink-0", inverted ? "text-warm-white/70" : "text-charcoal/45")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <path d="M1 1.5 6 6.5l5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 p-4 sm:p-6"
                onClick={() => setOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="locale-dialog-title"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(event) => event.stopPropagation()}
                  className="relative w-full max-w-3xl rounded-2xl bg-warm-white p-6 shadow-[0_24px_64px_rgba(28,30,27,0.25)] sm:p-10"
                >
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-charcoal/60 transition-colors hover:bg-stone hover:text-charcoal sm:right-6 sm:top-6"
                  >
                    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
                    </svg>
                  </button>

                  <h2
                    id="locale-dialog-title"
                    className="pr-10 text-center font-display text-lg text-charcoal sm:text-xl"
                  >
                    {label ?? "Choose your language"}
                  </h2>

                  <div className="mx-auto mt-3 h-px w-full max-w-xs bg-stone-dark" />

                  <ul
                    role="listbox"
                    aria-label={label ?? "Language"}
                    className="mx-auto mt-6 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    {locales.map((locale) => {
                      const isActive = locale === active;
                      const country = localeCountries[locale];
                      return (
                        <li key={locale}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => select(locale)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                              isActive
                                ? "bg-forest text-warm-white"
                                : "text-charcoal/80 hover:bg-forest/10 hover:text-forest"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
                                isActive ? "bg-warm-white/15" : "bg-stone"
                              )}
                            >
                              <FlagIcon iso={country.iso} className="h-8 w-8" />
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {country.name}
                            </span>
                            {isActive && (
                              <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3 w-3 shrink-0" aria-hidden="true">
                                <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
