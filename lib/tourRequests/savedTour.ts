import "server-only";
import { listRequestsForEmail } from "./store";
import { travellerFromCookies } from "./travellerSession";

/**
 * What the header can say about the visitor's own tour.
 *
 * Three answers, not two, because "we do not know" and "we know there is
 * nothing" want opposite buttons:
 *
 * - `unknown` — nobody is signed in, so there may well be a tour filed
 *   under an address we cannot see. The header offers the way in; the page
 *   behind it asks them to sign in. This is also every anonymous visitor,
 *   which is nearly all of them.
 * - `has-tour` — signed in, with at least one enquiry. The obvious button.
 * - `none` — signed in, and genuinely nothing filed under that address.
 *   The only state where offering a tour page would be a dead end, so this
 *   is the one that gets the wizard instead.
 *
 * **Anonymous visitors pay nothing for this.** With no traveller cookie,
 * `travellerFromCookies` returns before making any network call, so the
 * overwhelming majority of page views cost exactly what they did before.
 * A signed-in traveller costs one token verification and a Firestore read
 * bounded to a single document — enough to answer "any?" and no more.
 *
 * A failure answers `unknown` rather than `none`: offering the way in is
 * recoverable — worst case they land on a sign-in card — whereas telling
 * somebody with a tour that they have none is not. This runs in the header
 * on every page, so it is never allowed to throw.
 */
export type VisitorTourState = "unknown" | "has-tour" | "none";

export async function visitorTourState(): Promise<VisitorTourState> {
  try {
    const email = await travellerFromCookies();
    if (!email) return "unknown";

    const saved = await listRequestsForEmail(email, 1);
    return saved.length > 0 ? "has-tour" : "none";
  } catch (error) {
    console.error("Could not tell whether the visitor has a saved tour:", error);
    return "unknown";
  }
}
