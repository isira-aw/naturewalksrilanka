"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className={cn("border-b border-stone-dark", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        {title}
        <span
          aria-hidden="true"
          className={cn(
            "shrink-0 font-utility text-lg text-forest transition-transform duration-300",
            open && "rotate-45"
          )}
        >
          +
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0">
          <div className="pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
