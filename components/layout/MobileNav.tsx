"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { Navigation } from "@/lib/content/schema";

export function MobileNav({
  navigation,
  labels,
}: {
  navigation: Navigation;
  labels: { menu: string; close: string; checkAvailability: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen(true)}
        className="font-utility text-xs uppercase tracking-wide text-charcoal"
      >
        {labels.menu}
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-warm-white px-6 py-6"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg text-forest">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-utility text-xs uppercase tracking-wide text-charcoal"
            >
              {labels.close}
            </button>
          </div>
          <nav className="mt-12 flex flex-col gap-6">
            {navigation.main.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display text-3xl text-charcoal hover:text-forest"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={navigation.checkAvailability.href}
            onClick={() => setOpen(false)}
            className={cn(
              "mt-auto inline-flex items-center justify-center rounded-full bg-forest px-6 py-4 text-center font-medium text-warm-white"
            )}
          >
            {labels.checkAvailability}
          </Link>
        </div>
      )}
    </div>
  );
}
