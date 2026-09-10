import "server-only";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import type { Testimonials } from "@/lib/content/schema";
import { listApprovedReviews } from "./store";

/**
 * What the public site shows: the hand-written entries in `content/` plus
 * every approved review, newest first.
 *
 * Merged rather than replaced so the existing empty-state behaviour still
 * works and nothing has to be migrated. The static file is currently empty
 * and carries a note not to invent testimonials — real ones now have a way
 * in.
 *
 * A Firestore failure here must not take down the home page. Reviews are
 * decoration on a page whose job is to sell tours; if they cannot be
 * fetched the page renders without them.
 */
export async function publishedTestimonials(
  fromContent: Testimonials,
  locale: string,
): Promise<Testimonials> {
  if (!isFirebaseConfigured()) return fromContent;

  try {
    const approved = await listApprovedReviews();

    /* Reviews are shown in the language they were written in. Translating
       somebody's own words about their holiday is not ours to do. */
    const items = approved
      .filter((review) => review.locale === locale)
      .map((review) => ({
        author: review.author,
        country: review.country,
        quote: review.quote,
        rating: review.rating,
      }));

    return { ...fromContent, items: [...items, ...fromContent.items] };
  } catch (error) {
    console.error("Could not load approved reviews:", error);
    return fromContent;
  }
}

/**
 * The average and count for `AggregateRating`, or `null` when there is too
 * little to be meaningful.
 *
 * Three is the floor: a single five-star review rendered as "5.0 out of 5"
 * is technically true and reads as puffery, and search engines are entitled
 * to treat it that way too.
 */
export function aggregateRating(testimonials: Testimonials) {
  const rated = testimonials.items.filter((item) => typeof item.rating === "number");
  if (rated.length < 3) return null;

  const total = rated.reduce((sum, item) => sum + (item.rating ?? 0), 0);
  return {
    ratingValue: Math.round((total / rated.length) * 10) / 10,
    reviewCount: rated.length,
  };
}
