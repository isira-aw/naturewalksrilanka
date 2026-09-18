import { z } from "zod";
import { ITINERARY_CATEGORY_IDS } from "@/lib/itineraries/categories";

/**
 * The parts of the custom-tour wizard the team can change without a deploy.
 *
 * Everything here used to be a constant in the code: the traveller ceiling
 * lived in `WizardShell`, the interest list came straight from the category
 * enum, the accommodation options were an array in the step, and the notice
 * printed at the end of the document was a translation string. Each of those
 * is a business decision rather than a technical one, and each needed a code
 * change and a deployment to alter.
 *
 * Deliberately small. Only things the team has a reason to change, and
 * nothing whose wrong value would break the wizard rather than merely
 * configure it — the schema below refuses an empty interest list for exactly
 * that reason.
 */

/** The accommodation options the wizard offers, in the order it offers them. */
export const ACCOMMODATION_KEYS = [
  "budget",
  "comfortable",
  "boutique",
  "luxury",
  "ecoLodge",
  "recommend",
] as const;
export type AccommodationKey = (typeof ACCOMMODATION_KEYS)[number];

/**
 * The absolute ceiling, regardless of what the settings say.
 *
 * The configurable limit is what the wizard offers; this is what the server
 * will accept. They are separate because the enquiry endpoint is
 * unauthenticated — its validation cannot depend on a Firestore read that
 * might fail, and it must not be widened by anything a caller controls.
 * Well above any real group, and far below a number that would hurt.
 */
export const TRAVELLER_CEILING = 40;

export const customTourSettingsSchema = z.object({
  /** The largest group the wizard will let somebody pick. */
  maxTravellers: z.number().int().min(1).max(TRAVELLER_CEILING),
  /**
   * Which interests are offered, in order. At least one, because a wizard
   * step with nothing in it cannot be completed.
   */
  interests: z.array(z.enum(ITINERARY_CATEGORY_IDS)).min(1),
  /** Which accommodation styles are offered, in order. */
  accommodation: z.array(z.enum(ACCOMMODATION_KEYS)).min(1),
  /**
   * Replaces the closing notice printed on the PDF and the Word file.
   *
   * Empty means "use the translated one from the content files", which is
   * the right default: an override is English, and the document follows the
   * traveller's language. Worth it anyway, because this is the paragraph most
   * likely to need changing at short notice and least likely to be worth a
   * deployment.
   */
  documentNotice: z.string().max(2000),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});
export type CustomTourSettings = z.infer<typeof customTourSettingsSchema>;

/**
 * What the wizard does when nothing has been configured, which is also
 * exactly what it did before any of this existed.
 *
 * Used whenever the settings document is absent, malformed, or Firestore is
 * unreachable. The wizard is a public page: it has to work when the database
 * does not.
 */
export const DEFAULT_CUSTOM_TOUR_SETTINGS: CustomTourSettings = {
  maxTravellers: 12,
  interests: [...ITINERARY_CATEGORY_IDS],
  accommodation: [...ACCOMMODATION_KEYS],
  documentNotice: "",
};

/** Falls back rather than throwing — see the note on the defaults. */
export function parseSettings(value: unknown): CustomTourSettings {
  const parsed = customTourSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_CUSTOM_TOUR_SETTINGS;
}
