/**
 * The skeleton shown while a page's server work is in flight.
 *
 * Every page below the home page opens with `PageHero` — a full-bleed
 * photograph with a title over it — and continues with a centred column of
 * prose. This mirrors that rhythm rather than showing a spinner, so the
 * layout does not jump when the real content arrives.
 *
 * Deliberately not animated with framer-motion: this renders *before* the
 * page's own client components exist, so it has to be a server component with
 * no JavaScript at all. The shimmer is the Tailwind `animate-pulse` class,
 * which CSS already disables under the `prefers-reduced-motion` rule in
 * `globals.css`.
 *
 * `aria-hidden` throughout, with one polite live region announcing the state:
 * reading out a dozen empty boxes helps nobody, but silence is worse.
 */
export default function Loading() {
  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        Loading page
      </span>

      <div aria-hidden="true">
        {/* Hero */}
        <div className="relative h-[46vh] min-h-[320px] w-full animate-pulse bg-stone md:h-[58vh]">
          <div className="absolute inset-x-0 bottom-0 px-4 pb-10 sm:px-6 md:px-10 md:pb-14">
            <div className="mx-auto w-full max-w-6xl">
              <div className="h-2.5 w-24 rounded-full bg-stone-dark" />
              <div className="mt-5 h-9 w-4/5 rounded bg-stone-dark md:h-14 md:w-2/3" />
              <div className="mt-3 h-9 w-2/3 rounded bg-stone-dark md:h-14 md:w-1/2" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto w-full max-w-3xl animate-pulse px-4 py-16 sm:px-6 md:px-10 md:py-20">
          <div className="h-6 w-1/2 rounded bg-stone" />
          <div className="mt-6 space-y-3">
            {[
              "w-full",
              "w-full",
              "w-11/12",
              "w-full",
              "w-4/5",
            ].map((width, i) => (
              <div key={i} className={`h-3.5 rounded bg-stone ${width}`} />
            ))}
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <div className="aspect-[4/3] rounded-2xl bg-stone" />
            <div className="aspect-[4/3] rounded-2xl bg-stone" />
          </div>
        </div>
      </div>
    </>
  );
}
