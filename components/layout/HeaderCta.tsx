/**
 * The header's one adaptive button — the parts both halves of the header
 * need, and nothing that only the server can do.
 *
 * Deliberately free of `server-only` and of any Firestore import:
 * `MobileNav` is a client component and renders the same button, so
 * anything it touches has to be safe on both sides. The question of
 * *whether* the visitor has a tour is answered on the server, by
 * `lib/tourRequests/savedTour.ts`, and arrives here already decided.
 */

/** Where the header button points, and what it says. */
export type HeaderCta = { href: string; label: string; isTour: boolean };

/**
 * A person, for the tour button.
 *
 * Decorative in every use: the link it sits inside always carries the same
 * word as visible text, so announcing the glyph as well is noise.
 */
export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
