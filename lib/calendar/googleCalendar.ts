import "server-only";
import { google } from "googleapis";

export type FreeBusyResult =
  | { status: "available" }
  | { status: "unavailable"; busyRanges: { start: string; end: string }[] }
  | { status: "unknown" };

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { result: FreeBusyResult; expiresAt: number }>();

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_CALENDAR_ID
  );
}

function getClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Checks Nandana's calendar for the given date range and returns ONLY a
 * busy/free verdict — never event titles, descriptions, or attendees.
 * Degrades to "unknown" (never throws) when credentials are missing or the
 * Google API call fails, so the UI can fall back to a WhatsApp CTA.
 */
export async function checkAvailability(startDate: string, endDate: string): Promise<FreeBusyResult> {
  if (!isConfigured()) {
    return { status: "unknown" };
  }

  const cacheKey = `${startDate}_${endDate}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const calendar = getClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID as string;

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = response.data.calendars?.[calendarId]?.busy ?? [];

    const result: FreeBusyResult =
      busy.length === 0
        ? { status: "available" }
        : {
            status: "unavailable",
            busyRanges: busy
              .filter((b) => b.start && b.end)
              .map((b) => ({ start: b.start as string, end: b.end as string })),
          };

    cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return { status: "unknown" };
  }
}
