"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Experience } from "@/lib/content/schema";
import { ExperienceDialog, type ExperienceLabels } from "./ExperienceDialog";

/**
 * The prebuilt ideas that match whatever categories are ticked, as plain boxes.
 * Each box is deliberately just a title, a place and one line — everything else
 * lives behind "read more", in the dialog.
 */
export function SuggestionsPanel({
  experiences,
  labels,
}: {
  experiences: Experience[];
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
            {experiences.map((experience) => (
              <motion.li
                key={experience.slug}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="rounded-xl border border-stone-dark bg-warm-white p-4">
                  <p className="font-utility text-[10px] uppercase tracking-wide text-charcoal/45">
                    {experience.location}
                  </p>
                  <h4 className="mt-1 font-display text-lg leading-snug text-charcoal">
                    {experience.title}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-charcoal/60">
                    {experience.summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(experience)}
                    className="mt-3 font-utility text-xs uppercase tracking-wide text-forest underline underline-offset-4 transition-colors hover:text-forest-dark"
                  >
                    {labels.readMore}
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <ExperienceDialog experience={open} labels={labels} onClose={() => setOpen(null)} />
    </div>
  );
}
