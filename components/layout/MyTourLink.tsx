import { Link } from "@/i18n/navigation";

/**
 * The way back to a saved enquiry, in the header.
 *
 * An icon rather than a text link, to sit in the right-hand cluster without
 * competing with *Plan Your Journey* — that button is what a first-time
 * visitor is for, and most visitors are first-time visitors with no tour to
 * look at.
 *
 * An icon alone is ambiguous, though: a person glyph in a header reads as
 * "log in to an account", and there is no account here to log in to. Three
 * things carry the meaning instead — a `title` for the hover, an
 * `aria-label` for screen readers and voice control, and the visible word
 * beside it from the `sm` breakpoint up. `/my-trip` then says what it is in
 * its own heading, because somebody arriving from an icon deserves to land
 * somewhere self-explanatory.
 *
 * The luggage glyph is deliberate. A person means "your account"; a bag
 * means "your trip", which is the thing actually behind the link.
 */
export function MyTourLink({ label }: { label: string }) {
  return (
    <Link
      href="/my-trip"
      title={label}
      aria-label={label}
      className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-2 font-utility text-xs uppercase tracking-wide text-charcoal/80 transition-colors hover:text-forest sm:px-3"
    >
      <LuggageIcon className="h-[18px] w-[18px]" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function LuggageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Decorative: the link already carries its name via aria-label, and an
         icon announced a second time is noise in a screen reader. */
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3.5" y="7.5" width="17" height="13" rx="2.5" />
      <path d="M9 7.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2.5" />
      <path d="M9 11.5v5M15 11.5v5" />
    </svg>
  );
}
