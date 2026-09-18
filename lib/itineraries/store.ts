import "server-only";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  SCHEMA_VERSION,
  itineraryRecordSchema,
  slugify,
  type ItineraryArchive,
  type ItineraryRecord,
  type TranslationStatus,
} from "./types";

/**
 * Itineraries as one Firestore document each. The only store there is.
 *
 * Firestore is the one source of truth. There is no second backend and no
 * runtime choice to make, so there is no indirection here either — route
 * handlers call these functions directly.
 *
 * Named `store.ts` to match `lib/reviews/store.ts` and
 * `lib/tourRequests/store.ts` — in this repository a `store.ts` is always the
 * server-side Firestore access for one collection. The browser's fetch
 * wrapper for these same records is `browserStore.ts`, next door.
 *
 * One document per record, rather than one file holding all of them, is what
 * removes the write race: with a single JSON file, two admins editing
 * different itineraries at the same time meant the second write silently
 * discarded the first.
 */

function collection() {
  const { db } = requireFirebase();
  return db.collection(COLLECTIONS.itineraries);
}

/**
 * Every record, oldest schema problems skipped rather than fatal.
 *
 * One malformed document should not take down the whole custom-tour page, so
 * a record that fails validation is logged and left out. Silently returning
 * fewer itineraries is bad; returning none is worse.
 */
export async function listRecords(): Promise<ItineraryRecord[]> {
  const snapshot = await collection().get();
  const records: ItineraryRecord[] = [];

  for (const doc of snapshot.docs) {
    const parsed = itineraryRecordSchema.safeParse(doc.data());
    if (parsed.success) {
      records.push(parsed.data);
    } else {
      console.error(`Skipping malformed itinerary ${doc.id}:`, parsed.error.issues);
    }
  }

  return records.sort(byPlacement);
}

/**
 * The order the wizard offers itineraries in, and the order the admin list
 * shows them in — one rule, so the team sees what a traveller will.
 *
 * Featured first, then everything else alphabetically.
 */
function byPlacement(a: ItineraryRecord, b: ItineraryRecord) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return a.head.localeCompare(b.head);
}

/** Creates or replaces exactly one itinerary. */
export async function saveRecord(record: ItineraryRecord): Promise<ItineraryRecord> {
  const next = {
    ...record,
    slug: await uniqueSlugFor(record.head, record.id),
    updatedAt: new Date().toISOString(),
  };
  await collection().doc(next.id).set(next);
  return next;
}

/**
 * A slug no other itinerary is using.
 *
 * Decided here rather than in the browser. The editor used to work it out
 * from the records it had loaded, which was every record — but the list is
 * paged now, so the browser sees one page and would happily hand out a slug
 * that collides with something on page three. The slug is what the wizard and
 * the printed documents key on, so a collision is not cosmetic.
 *
 * One query per attempt, and attempts are rare: the first is free unless the
 * title really is taken.
 */
async function uniqueSlugFor(head: string, selfId: string): Promise<string> {
  const root = slugify(head) || "itinerary";

  for (let n = 1; n < 50; n += 1) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const clash = await collection().where("slug", "==", candidate).limit(2).get();

    /* Its own document holding the slug is not a clash. */
    if (clash.docs.every((doc) => doc.id === selfId)) return candidate;
  }

  /* Fifty itineraries sharing a title is not a real case; a unique suffix is
     better than looping forever or overwriting somebody. */
  return `${root}-${Date.now().toString(36)}`;
}

export async function deleteRecord(id: string): Promise<void> {
  await collection().doc(id).delete();
}

/**
 * Every record wrapped in the envelope the client store expects.
 *
 * The envelope outlived the export it was shaped for — `GET /api/itineraries`
 * still answers in this form, and the browser store still parses it — so the
 * `schemaVersion` stays meaningful even though nothing writes a file any more.
 */
export async function readArchiveEnvelope(): Promise<ItineraryArchive> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records: await listRecords(),
  };
}

export { SCHEMA_VERSION };

/* ---- the admin list ---------------------------------------------------- */

/** How many itineraries one page of the admin list holds. */
export const ITINERARY_PAGE_SIZE = 20;

/**
 * What the admin list actually shows.
 *
 * The full record carries both content blocks, every highlight, a blur map and
 * **all four translations inline** — a page of forty of those is a large
 * document to build, send and parse for a list that displays a title, a
 * category and a set of status dots. The editor fetches the one record being
 * edited; nothing else needs the prose.
 */
export type ItinerarySummary = {
  id: string;
  slug: string;
  head: string;
  category: ItineraryRecord["category"];
  province: ItineraryRecord["province"];
  hidden: boolean;
  featured: boolean;
  updatedAt: string;
  /** First photograph only — the list shows one thumbnail at most. */
  image?: string;
  /** Per-locale status, without the translated text itself. */
  translations: Record<string, TranslationStatus>;
};

export type ItineraryPage = {
  items: ItinerarySummary[];
  nextCursor?: string;
};

function summarise(record: ItineraryRecord): ItinerarySummary {
  const translations: Record<string, TranslationStatus> = {};
  for (const [locale, translation] of Object.entries(record.translations)) {
    translations[locale] = translation.status;
  }

  return {
    id: record.id,
    slug: record.slug,
    head: record.head,
    category: record.category,
    province: record.province,
    hidden: record.hidden,
    featured: record.featured,
    updatedAt: record.updatedAt,
    image: record.images[0],
    translations,
  };
}

/**
 * One page of the admin list, alphabetically by title.
 *
 * Ordered by `head` rather than by the placement rule the wizard uses, and
 * that is a deliberate limitation worth knowing about: `featured` cannot drive
 * a Firestore ordering here because **a document missing the field is left out
 * of an `orderBy` on it entirely** — every itinerary written before that field
 * existed would vanish from the list. `head` is on every record, always.
 *
 * So the list is alphabetical and shows `Featured` as a label instead. The
 * wizard still offers them in placement order; that read is the whole (small)
 * collection and sorts in memory.
 */
export async function listRecordsPage({
  cursor,
  limit = ITINERARY_PAGE_SIZE,
}: { cursor?: string; limit?: number } = {}): Promise<ItineraryPage> {
  const size = Math.min(Math.max(Math.trunc(limit) || ITINERARY_PAGE_SIZE, 1), 100);

  let query = collection().orderBy("head", "asc");
  if (cursor) query = query.startAfter(cursor);

  /* One more than asked for, so "is there another page" needs no second read. */
  const snapshot = await query.limit(size + 1).get();
  const page = snapshot.docs.slice(0, size);

  const items: ItinerarySummary[] = [];
  for (const doc of page) {
    const parsed = itineraryRecordSchema.safeParse(doc.data());
    if (parsed.success) items.push(summarise(parsed.data));
    else console.error(`Skipping malformed itinerary ${doc.id}:`, parsed.error.issues);
  }

  /* From the last document read, not the last one parsed: a page where
     everything failed to parse would otherwise stop the listing dead. */
  const last = page[page.length - 1]?.data() as { head?: unknown } | undefined;

  return {
    items,
    nextCursor:
      snapshot.docs.length > size && typeof last?.head === "string" ? last.head : undefined,
  };
}

/** One record in full, for the editor. */
export async function getRecord(id: string): Promise<ItineraryRecord | null> {
  const doc = await collection().doc(id).get();
  if (!doc.exists) return null;

  const parsed = itineraryRecordSchema.safeParse(doc.data());
  if (!parsed.success) {
    console.error(`Malformed itinerary ${id}:`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}
