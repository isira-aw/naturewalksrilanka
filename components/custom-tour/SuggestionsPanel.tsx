"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Experience } from "@/lib/content/schema";
import { ExperienceDialog, type ExperienceLabels } from "./ExperienceDialog";

/**
 * The prebuilt ideas that match whatever categories are ticked, as plain boxes.
 * Each box is deliberately just a title, a place and one line — everything else
 * lives behind "read more", in the dialog. Ticking one adds it to the enquiry
 * that goes to WhatsApp at the end of the wizard.
 */
export function SuggestionsPanel({
  experiences,
  selected,
  onToggle,
  labels,
}: {
  experiences: Experience[];
  selected: string[];
  onToggle: (slug: string) => void;
  labels: ExperienceLabels & { title: string; empty: string; count: string };
}) {
  const [open, setOpen] = useState<Experience | null>(null);

  return (
    <div className="rounded-2xl border border-stone-dark bg-stone/30 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-utility text-xs uppercase tracking-wide text-forest">{labels.title}</h3>
        {experiences.length > 0 && (
          <span className="font-utility text-[11px] text-charcoal/45">{labels.count}</span>
        )}
      </div>

      {experiences.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-charcoal/50">{labels.empty}</p>
      ) : (
        <ul className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1 lg:max-h-[32rem]">
          <AnimatePresence initial={false}>
            {experiences.map((experience) => {
              const isSelected = selected.includes(experience.slug);
              return (
                <motion.li
                  key={experience.slug}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className={cn(
                      "rounded-xl border bg-warm-white p-4 transition-colors",
                      isSelected ? "border-forest bg-forest/[0.04]" : "border-stone-dark"
                    )}
                  >
                    <p className="font-utility text-[10px] uppercase tracking-wide text-charcoal/45">
                      {experience.location}
                    </p>
                    <h4 className="mt-1 font-display text-lg leading-snug text-charcoal">
                      {experience.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-charcoal/60">
                      {experience.summary}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <SelectButton
                        selected={isSelected}
                        labels={labels}
                        onClick={() => onToggle(experience.slug)}
                      />
                      <button
                        type="button"
                        onClick={() => setOpen(experience)}
                        className="font-utility text-xs uppercase tracking-wide text-forest underline underline-offset-4 transition-colors hover:text-forest-dark"
                      >
                        {labels.readMore}
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <ExperienceDialog
        experience={open}
        labels={labels}
        selected={open ? selected.includes(open.slug) : false}
        onToggle={onToggle}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

function SelectButton({
  selected,
  labels,
  onClick,
}: {
  selected: boolean;
  labels: { add: string; added: string };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-full border px-3.5 font-utility text-xs uppercase tracking-wide transition-colors",
        selected
          ? "border-forest bg-forest text-warm-white"
          : "border-stone-dark text-charcoal/70 hover:border-forest hover:text-forest"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          selected ? "border-warm-white/70" : "border-charcoal/25"
        )}
      >
        {selected && (
          <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-2 w-2">
            <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {selected ? labels.added : labels.add}
    </button>
  );
}
