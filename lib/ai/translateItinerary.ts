import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { translatableSchema, type TranslatableFields } from "@/lib/itineraries/types";
import { localeNames, type Locale } from "@/i18n/routing";

const MODEL = "gemini-3.6-flash";
const MAX_OUTPUT_TOKENS = 4096;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    head: { type: Type.STRING },
    bestTime: { type: Type.STRING },
    suggestedLength: { type: Type.STRING },
    content1: { type: Type.STRING },
    content2: { type: Type.STRING },
    highlights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["name"],
      },
    },
  },
  required: ["head", "content1", "highlights"],
};

export type TranslationOutcome =
  | { ok: true; fields: TranslatableFields }
  | { ok: false; error: string };

function buildPrompt(source: TranslatableFields, locale: Locale) {
  return `Translate this Sri Lanka tour itinerary from English into ${localeNames[locale]} (locale code "${locale}").

Rules:
- Translate the prose naturally, as a travel writer would write it in ${localeNames[locale]} — do not translate word for word.
- Keep every proper noun exactly as written: place names, national parks, temples, and Sri Lankan words.
- Keep bird, mammal and reptile species in their international English names, as field guides and checklists use them. Translate the description that follows a species name, not the name itself.
- Return exactly ${source.highlights.length} highlights, in the same order as the input.
- Keep "bestTime" and "suggestedLength" in the same short form as the input (a season, a number of days).
- Do not add, remove or reorder any information.

Itinerary (JSON):
${JSON.stringify(source, null, 2)}

Return ONLY the translated JSON in the same shape.`;
}

/**
 * Translates one itinerary into one locale.
 *
 * Never throws: Gemini is a third-party service that is sometimes unavailable,
 * and the admin page's whole retry flow depends on getting a reason back
 * rather than an exception — the itinerary stays untranslated and translating
 * it again later is one more click.
 */
export async function translateItinerary(
  source: TranslatableFields,
  locale: Locale
): Promise<TranslationOutcome> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { ok: false, error: "Translation is not configured on this deployment." };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(source, locale),
      config: {
        responseMimeType: "application/json",
        responseSchema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) return { ok: false, error: "Gemini returned an empty response." };

    const parsed = translatableSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return { ok: false, error: "Gemini returned a response in an unexpected shape." };
    }

    /* A translation that dropped or invented a highlight would silently
       misalign every "what you might see" entry against its photograph. */
    if (parsed.data.highlights.length !== source.highlights.length) {
      return {
        ok: false,
        error: `Gemini returned ${parsed.data.highlights.length} highlights instead of ${source.highlights.length}.`,
      };
    }

    return { ok: true, fields: parsed.data };
  } catch (error) {
    console.error("[admin] itinerary translation failed", error);
    return { ok: false, error: "Gemini is unavailable right now. Try again later." };
  }
}
