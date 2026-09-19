import "server-only";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS, COMMENTS_SUBCOLLECTION } from "@/lib/firebase/collections";
import { tripCommentSchema, type CommentAuthor, type TripComment } from "./types";

/**
 * The thread on one enquiry.
 *
 * This is what replaced editing. The enquiry is a record of what somebody
 * asked for, and a record either side can rewrite afterwards is worth
 * nothing to either side; but a traveller who has changed their phone
 * number, or a guide who has found a better week for leopards, still needs
 * somewhere to say so. They say it here, appended, attributed and dated,
 * and the enquiry above it stays as it was sent.
 *
 * One subcollection per enquiry rather than one collection of comments with
 * a reference field: the thread is worthless away from its enquiry, and
 * hanging it off the parent means deleting the enquiry takes the thread
 * with it (`deleteRequest` in `store.ts`) instead of leaving it orphaned in
 * a collection nothing reads.
 */

function thread(reference: string) {
  const { db } = requireFirebase();
  return db
    .collection(COLLECTIONS.tourRequests)
    .doc(reference.trim().toUpperCase())
    .collection(COMMENTS_SUBCOLLECTION);
}

/**
 * A ceiling on the thread.
 *
 * Both sides posting here are authenticated, so this is not a spam
 * defence — it is the bound that stops one long-running conversation from
 * turning a Firestore read of an enquiry into an unbounded one. A thread
 * that reaches it has stopped being a note on an enquiry and become a chat,
 * which is what WhatsApp is for.
 */
export const MAX_COMMENTS = 200;

/** Every comment on an enquiry, oldest first — the order they were said in. */
export async function listComments(reference: string): Promise<TripComment[]> {
  const snapshot = await thread(reference).orderBy("createdAt", "asc").limit(MAX_COMMENTS).get();

  const comments: TripComment[] = [];
  for (const doc of snapshot.docs) {
    const parsed = tripCommentSchema.safeParse(doc.data());
    if (parsed.success) comments.push(parsed.data);
    else console.error(`Skipping malformed comment ${reference}/${doc.id}`);
  }
  return comments;
}

/** Whether the thread has room for another. */
async function hasRoom(reference: string): Promise<boolean> {
  const count = await thread(reference).count().get();
  return count.data().count < MAX_COMMENTS;
}

export type AddCommentResult =
  | { ok: true; comment: TripComment }
  | { ok: false; reason: "full" };

/**
 * Appends one comment.
 *
 * The caller has already established two things this cannot re-check: that
 * whoever is writing is who they say they are, and that this enquiry is
 * theirs to write on. Both live at the route handlers, next to the sessions
 * that prove them — `/api/traveller/requests/[reference]/comments` and its
 * admin counterpart.
 *
 * The id is Firestore's, and `createdAt` is the server's clock rather than
 * the caller's: ordering a thread by a time the client supplied would let a
 * wrong timezone put a reply above the question.
 */
export async function addComment(
  reference: string,
  { author, authorEmail, body }: { author: CommentAuthor; authorEmail: string; body: string },
): Promise<AddCommentResult> {
  if (!(await hasRoom(reference))) return { ok: false, reason: "full" };

  const doc = thread(reference).doc();
  const comment: TripComment = {
    id: doc.id,
    author,
    authorEmail,
    body,
    createdAt: new Date().toISOString(),
  };

  await doc.set(comment);
  return { ok: true, comment };
}

/**
 * The thread as the traveller may see it.
 *
 * Staff addresses are removed. The traveller needs to know a reply came
 * from Nature Walk rather than from themselves, which `author` already
 * says; which guide typed it is the team's business, and putting personal
 * addresses on a page anyone signed in can read is a leak with no upside.
 */
export function forTraveller(comments: TripComment[]) {
  return comments.map(({ id, author, body, createdAt }) => ({
    id,
    author,
    body,
    createdAt,
  }));
}

/** One comment, as a traveller sees it. */
export type PublicComment = ReturnType<typeof forTraveller>[number];
