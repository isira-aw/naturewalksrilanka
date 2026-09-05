"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { Navigation } from "@/lib/content/schema";

/**
 * `usePathname` from the i18n navigation helpers is already locale-stripped,
 * so it compares directly against the hrefs authored in navigation.json.
 * A nested route (/tours/18-days) keeps its parent nav item marked.
 */
export function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  items,
  variant = "header",
  onNavigate,
}: {
  items: Navigation["main"];
  variant?: "header" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <>
        {items.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-fit py-3 font-display text-2xl transition-colors hover:text-forest sm:text-3xl",
                active
                  ? "text-forest underline decoration-forest/50 underline-offset-8"
                  : "text-charcoal"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {items.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap py-1 font-utility text-xs uppercase tracking-wide transition-colors",
              active ? "text-forest" : "text-charcoal/80 hover:text-forest"
            )}
          >
            {item.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-px bg-forest"
              />
            )}
          </Link>
        );
      })}
    </>
  );
}
