/**
 * The five interest categories the wizard offers and every itinerary belongs
 * to. Client-safe on purpose: the admin form, the wizard step and the content
 * schema all read this one list, so a category can never exist in one place
 * and not another.
 *
 * An itinerary belongs to exactly one category. "Birding and wildlife" and
 * "Wildlife and photography" overlap in subject but are separate products —
 * author a second itinerary rather than tagging one entry with both.
 */
export const ITINERARY_CATEGORIES = [
  { id: "birding-wildlife", label: "Birding and Wildlife" },
  { id: "wildlife-photography", label: "Wildlife and Photography" },
  { id: "culture", label: "Culture Tours" },
  { id: "adventure", label: "Adventure Tours" },
  { id: "others", label: "Others" },
] as const;

export type ItineraryCategory = (typeof ITINERARY_CATEGORIES)[number]["id"];

export const ITINERARY_CATEGORY_IDS = ITINERARY_CATEGORIES.map((c) => c.id) as [
  ItineraryCategory,
  ...ItineraryCategory[],
];

export function isItineraryCategory(value: string): value is ItineraryCategory {
  return (ITINERARY_CATEGORY_IDS as readonly string[]).includes(value);
}

/** The English label; the wizard uses the translated one from `ui.json`. */
export function categoryLabel(id: ItineraryCategory) {
  return ITINERARY_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
