/**
 * Central reference for where each image on the site currently comes from,
 * so assets can be swapped for final photography without hunting through
 * every content file that references them.
 */
export const imageMap = {
  "hero-1": { path: "/images/hero-1.jpg", source: "naturewalksrilanka.com/img/mycarousel-1.jpg", replaceWithFinal: true },
  "hero-2": { path: "/images/hero-2.jpg", source: "naturewalksrilanka.com/img/mycarousel-2.jpg", replaceWithFinal: true },
  "nandana-portrait": { path: "/images/nandana-portrait.jpg", source: "naturewalksrilanka.com/img/me.jpg", replaceWithFinal: true },
  "story-1": { path: "/images/story-1.jpg", source: "naturewalksrilanka.com/img/package-21.jpg", replaceWithFinal: true },
  "story-2": { path: "/images/story-2.jpg", source: "naturewalksrilanka.com/img/package-12.jpg", replaceWithFinal: true },
  "og-default": { path: "/images/og-default.jpg", source: "naturewalksrilanka.com/img/mycarousel-1.jpg", replaceWithFinal: true },
  "placeholder-destination": {
    path: "/images/placeholder-destination.jpg",
    source: "naturewalksrilanka.com/img/mycarousel-2.jpg",
    replaceWithFinal: true,
    note: "Generic atmospheric placeholder reused across every destination page — not a photo of the specific destination. Replace per-destination once real photography exists.",
  },
  "tour-18-days": { path: "/images/tours/tour-18-days.jpg", source: "naturewalksrilanka.com/img/package-61.jpg", replaceWithFinal: true },
  "tour-16-days": { path: "/images/tours/tour-16-days.jpg", source: "naturewalksrilanka.com/img/package-51.jpg", replaceWithFinal: true },
  "tour-12-days": { path: "/images/tours/tour-12-days.jpg", source: "naturewalksrilanka.com/img/package-41.jpg", replaceWithFinal: true },
  "tour-10-days": { path: "/images/tours/tour-10-days.jpg", source: "naturewalksrilanka.com/img/package-31.jpg", replaceWithFinal: true },
} as const;
