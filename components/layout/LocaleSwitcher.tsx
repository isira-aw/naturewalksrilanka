"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

export function LocaleSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const active = params.locale as Locale;

  return (
    <div className={cn("flex items-center gap-1 font-utility text-xs uppercase", className)}>
      {locales.map((locale, i) => (
        <span key={locale} className="flex items-center">
          {i > 0 && <span className="mx-1 text-charcoal/30">/</span>}
          <button
            type="button"
            aria-current={locale === active}
            onClick={() => router.replace(pathname, { locale })}
            className={cn(
              "-my-2 px-1 py-2 transition-colors",
              locale === active ? "text-forest" : "text-charcoal/50 hover:text-forest"
            )}
          >
            {locale}
          </button>
        </span>
      ))}
    </div>
  );
}
