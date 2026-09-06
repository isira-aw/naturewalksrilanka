"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

/**
 * A select rather than a row of codes: with five languages the codes stopped
 * being readable, and a native select gives every device its own picker.
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
  const [isPending, startTransition] = useTransition();
  const active = params.locale as Locale;

  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label ?? "Language"}
        value={active}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale;
          startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
          });
        }}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-full border bg-transparent py-2 pl-4 pr-9 font-utility text-xs uppercase tracking-wide transition-colors focus:outline-none focus:ring-1 disabled:opacity-60",
          tone === "inverted"
            ? "border-warm-white/30 text-warm-white hover:border-warm-white/60 focus:ring-warm-white/60"
            : "border-charcoal/20 text-charcoal/80 hover:border-forest hover:text-forest focus:ring-forest"
        )}
      >
        {locales.map((locale) => (
          /* Options render in the OS palette, so they stay on a light ground. */
          <option key={locale} value={locale} className="bg-warm-white text-charcoal">
            {localeNames[locale]}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2",
          tone === "inverted" ? "text-warm-white/70" : "text-charcoal/50"
        )}
      >
        <svg viewBox="0 0 12 8" className="h-2 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1.5 6 6.5l5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}
