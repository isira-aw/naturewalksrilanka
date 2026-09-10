import { z } from "zod";

/**
 * The traveller's unfinished custom tour, kept in their own browser.
 *
 * Filling the wizard in takes a while, and until now every answer lived only
 * in React state: a refresh, a back button, a phone call that killed the tab,
 * or a dropped connection lost the lot. Saving to `localStorage` fixes that
 * without a server, an account, or a request — the draft never leaves the
 * device it was typed on, so there is nothing to secure and nothing to pay
 * for.
 *
 * Everything here is defensive on purpose. `localStorage` throws outright in
 * some privacy modes and when a browser is set to block site data, and the
 * stored shape can be older than the code reading it, so both the read and
 * the write are allowed to fail quietly. A wizard that cannot save is still a
 * working wizard; one that crashes on a stale draft is not.
 */

const KEY = "nwsl_custom_tour_draft";

/**
 * Bump when the saved shape changes incompatibly. An older draft is then
 * discarded rather than half-restored into fields that no longer mean what
 * they used to.
 */
const VERSION = 1;

/** After a month, a half-filled trip is a stranger's, not a continuation. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/* Dates are already ISO `YYYY-MM-DD` strings (see lib/tour/dateRange.ts), so
   the whole state is plain JSON — nothing needs reviving on the way back in. */
const draftStateSchema = z.object({
  step: z.number().int().min(1),
  travelers: z.number().int(),
  dateRange: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
  }),
  interests: z.array(z.string()),
  selectedExperiences: z.array(z.string()),
  accommodation: z.array(z.string()),
  accommodationNotes: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  country: z.string(),
  requirements: z.string(),
});

export type DraftState = z.infer<typeof draftStateSchema>;

const envelopeSchema = z.object({
  version: z.literal(VERSION),
  savedAt: z.number(),
  state: draftStateSchema,
});

/** `localStorage` itself can throw on access, not just on use. */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveDraft(state: DraftState) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: Date.now(), state }));
  } catch {
    /* Quota exceeded, or the browser refuses to store anything. Not worth
       interrupting someone planning a holiday over. */
  }
}

/**
 * The saved draft, or `null` when there is none, it is unreadable, it was
 * written by an incompatible version, or it has simply gone stale.
 *
 * Call this from an effect, never during render: these pages are prerendered
 * per locale, `localStorage` does not exist on the server, and reading it
 * while rendering would make the first client paint disagree with the HTML.
 */
export function loadDraft(): DraftState | null {
  const store = storage();
  if (!store) return null;

  let raw: string | null;
  try {
    raw = store.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearDraft();
    return null;
  }

  const envelope = envelopeSchema.safeParse(parsed);
  if (!envelope.success) {
    clearDraft();
    return null;
  }

  if (Date.now() - envelope.data.savedAt > MAX_AGE_MS) {
    clearDraft();
    return null;
  }

  return envelope.data.state;
}

export function clearDraft() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(KEY);
  } catch {
    /* Nothing useful to do. */
  }
}

/**
 * Whether a draft holds enough to be worth offering back. A traveller who
 * only bumped the party size has nothing to resume, and being asked about it
 * is worse than being asked nothing.
 */
export function isResumable(state: DraftState): boolean {
  return (
    state.step > 1 ||
    state.interests.length > 0 ||
    state.selectedExperiences.length > 0 ||
    Boolean(state.dateRange.start) ||
    Boolean(state.name.trim() || state.email.trim() || state.phone.trim())
  );
}
