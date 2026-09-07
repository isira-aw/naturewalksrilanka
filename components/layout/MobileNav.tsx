"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { Navigation } from "@/lib/content/schema";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavLinks } from "./NavLinks";

export function MobileNav({
  navigation,
  labels,
}: {
  navigation: Navigation;
  labels: { menu: string; close: string; primaryCta: string; language: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen(true)}
        className="-mr-1 flex h-11 min-w-11 items-center justify-center whitespace-nowrap px-2 font-utility text-xs uppercase tracking-wide text-charcoal"
      >
        {labels.menu}
      </button>

      {open &&
        createPortal(
          <div
            id="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-warm-white px-6 py-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg text-forest">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-1 flex h-11 min-w-11 items-center justify-center whitespace-nowrap px-2 font-utility text-xs uppercase tracking-wide text-charcoal"
              >
                {labels.close}
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
              <NavLinks
                items={navigation.main}
                variant="mobile"
                onNavigate={() => setOpen(false)}
              />
            </nav>

            <div className="mt-8">
              <p className="mb-3 font-utility text-xs uppercase tracking-wide text-charcoal/50">
                {labels.language}
              </p>
              <LocaleSwitcher label={labels.language} className="max-w-56" />
            </div>

            <Link
              href={navigation.primaryCta.href}
              onClick={() => setOpen(false)}
              className={cn(
                "mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-6 py-4 text-center font-medium text-warm-white"
              )}
            >
              {labels.primaryCta}
            </Link>
          </div>,
          document.body
        )}
    </div>
  );
}
