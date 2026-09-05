"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

export function LocaleSwitcher({
  className,
  /** "inverted" for the dark footer, where forest green would sink into charcoal. */
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverted";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const active = params.locale as Locale;

  const activeClasses =
    tone === "inverted"
      ? "border-warm-white/70 text-warm-white"
      : "border-forest text-forest";
  const idleClasses =
    tone === "inverted"
      ? "text-warm-white/50 hover:text-warm-white"
      : "text-charcoal/50 hover:text-forest";

  return (
    <div className={cn("flex items-center gap-1 font-utility text-xs uppercase", className)}>
      {locales.map((locale, i) => (
        <span key={locale} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="mx-1 text-current opacity-30">
              /
            </span>
          )}
          <button
            type="button"
            aria-current={locale === active}
            onClick={() => router.replace(pathname, { locale })}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
              locale === active ? activeClasses : cn("border-transparent", idleClasses)
            )}
          >
            {locale}
          </button>
        </span>
      ))}
    </div>
  );
}
