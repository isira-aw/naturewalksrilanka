import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { translatableSchema, type TranslatableFields } from "@/lib/itineraries/types";
import { localeNames, type Locale } from "@/i18n/routing";

/**
 * The model, overridable without a deployment.
 *
 * Google retires and renames model ids on its own schedule, and a wrong one
 * fails every translation with an error that reads like an outage. Making it
 * an environment variable means correcting it is a settings change, not a
 * release. The default is the id this was written against; the AI section of
 * the admin panel has a button that proves whether it still resolves.
 */
export const DEFAULT_MODEL = "gemini-3.6-flash";

export function translationModel(): string {
  return process.env.GOOGLE_AI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isTranslationConfigured(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}

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
      model: translationModel(),
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

/**
 * Does the configured key and model actually work?
 *
 * Asks for one token, which is the cheapest question that still exercises the
 * whole path: the key is accepted, the model id resolves, and the service is
 * reachable. Everything this can go wrong with has gone wrong for somebody —
 * and until now the only way to find out was to translate a real itinerary
 * and read the failure.
 */
export async function checkTranslationService(): Promise<
  { ok: true; model: string } | { ok: false; model: string; error: string }
> {
  const model = translationModel();
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { ok: false, model, error: "GOOGLE_AI_API_KEY is not set on this deployment." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: "Reply with the single word: ok",
      config: { maxOutputTokens: 8, temperature: 0 },
    });

    if (!response.text) return { ok: false, model, error: "The model returned nothing." };
    return { ok: true, model };
  } catch (error) {
    /* Surfaced rather than swallowed: "model not found" and "key rejected"
       need completely different fixes, and the whole point of this check is
       to tell them apart. */
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, model, error: message.slice(0, 300) };
  }
}
