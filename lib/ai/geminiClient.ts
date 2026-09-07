import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { SRI_LANKA_LOCATIONS } from "./sriLankaLocations";
import { itineraryPlanSchema, type ItineraryPlan, type ItineraryRequest } from "./itinerarySchema";

const MODEL = "gemini-3.6-flash";
const MAX_OUTPUT_TOKENS = 8192;
const MAX_DAYS = 14;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.NUMBER },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                slug: { type: Type.STRING },
                name: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
                description: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                travelMinutesFromPrevious: { type: Type.NUMBER, nullable: true },
                distanceKmFromPrevious: { type: Type.NUMBER, nullable: true },
                suitability: { type: Type.STRING },
                recommended: { type: Type.BOOLEAN },
              },
              required: ["slug", "name", "lat", "lng", "description", "keywords", "suitability", "recommended"],
            },
          },
        },
        required: ["day", "options"],
      },
    },
  },
  required: ["days"],
};

function tripLengthDays(startDate: string, endDate: string) {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function buildPrompt(request: ItineraryRequest, days: number) {
  const locationCatalog = SRI_LANKA_LOCATIONS.map(
    (loc) =>
      `- ${loc.name} (slug: ${loc.slug}, region: ${loc.region}, lat: ${loc.lat}, lng: ${loc.lng}, activities: ${loc.activities.join("/")}) — ${loc.seasonNote}`
  ).join("\n");

  return `You are a Sri Lanka trip-planning assistant for a private nature-tour operator. Build a day-by-day itinerary plan for a ${days}-day trip.

Traveler count: ${request.travelers}
Travel dates: ${request.startDate} to ${request.endDate}
Interests: ${request.interests.join(", ") || "no strong preference"}
Accommodation style: ${request.accommodation.join(", ") || "no strong preference"}
Accommodation notes: ${request.accommodationNotes || "none"}

Choose ONLY from this catalog of known Sri Lanka locations (do not invent new places, and reuse the exact slug/lat/lng given):
${locationCatalog}

For each day of the trip, propose 3 to 5 candidate location options a traveler could choose between, considering:
- realistic road travel time/distance between consecutive days (rough estimates are fine)
- the seasonal/weather/natural-disaster note for each location relative to the given travel dates (avoid or caveat locations with elevated risk in that period, e.g. monsoon flooding, landslide-prone hill roads, rough seas)
- how well each location matches the stated interests and accommodation style
- keep the overall route geographically sensible (avoid criss-crossing the island unnecessarily)

For each option return: slug, name, lat, lng, a one-sentence description, up to 6 short keywords, travelMinutesFromPrevious and distanceKmFromPrevious (null for day 1), and a one-sentence "suitability" note referencing the traveler's interests and/or the season.

For each day, set recommended: true on exactly ONE of that day's options — the single best match considering interests, season/safety, and route efficiency — and recommended: false on all the others.

Return ONLY the structured itinerary JSON.`;
}

/**
 * Generates a full day-by-day itinerary tree in a single request. Never
 * throws — returns null on any failure (missing key, API error, or a
 * response that fails schema validation) so the route can fall back to a
 * friendly error + WhatsApp CTA rather than a hard failure.
 */
export async function generateItinerary(request: ItineraryRequest): Promise<ItineraryPlan | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const days = Math.min(MAX_DAYS, tripLengthDays(request.startDate, request.endDate));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(request, days),
      config: {
        responseMimeType: "application/json",
        responseSchema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) return null;

    const parsed = itineraryPlanSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error("[ai-assistant] itinerary schema validation failed", parsed.error.issues);
      return null;
    }

    return parsed.data;
  } catch (err) {
    console.error("[ai-assistant] itinerary generation failed", err);
    return null;
  }
}
