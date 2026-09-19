import "server-only";
import { listRequestsForEmail } from "./store";
import { travellerFromCookies } from "./travellerSession";

/**
 * Whether the visitor has a tour of their own to look at.
 *
 * The header's one button used to always say *Plan Your Journey*. That is
 * right for somebody who has never sent anything and wrong for somebody who
 * has: they are not here to plan a second tour, they are here to see what
 * happened to the first. This is the question that lets one button do both.
 *
 * **Anonymous visitors pay nothing for it.** With no traveller cookie,
 * `travellerFromCookies` returns before making any network call, so the
 * overwhelming majority of page views cost exactly what they did before. A
 * signed-in traveller costs one token verification and a Firestore read
 * bounded to a single document — enough to answer "any?" and no more.
 *
 * Every failure answers `false`. The wizard is the safe thing to show
 * someone we cannot place: it is useful to everybody, whereas sending a
 * stranger to an empty tour page is not. This runs in the header, on every
 * page, so it must never be the reason one of them fails to render.
 */
export async function hasSavedTour(): Promise<boolean> {
  try {
    const email = await travellerFromCookies();
    if (!email) return false;

    const saved = await listRequestsForEmail(email, 1);
    return saved.length > 0;
  } catch (error) {
    console.error("Could not tell whether the visitor has a saved tour:", error);
    return false;
  }
}
