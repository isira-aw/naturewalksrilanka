"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * The sidebar, and nothing else.
 *
 * Each section is a real route now, not a piece of state. That is what makes
 * the panel quick to open: Next code-splits per route, so answering one review
 * no longer downloads the itinerary editor, the image-upload code and the
 * translation grid along with it. It also means a section can be bookmarked
 * and the back button behaves.
 *
 * This component renders for every section, so it must stay cheap — it holds
 * no data and fetches nothing. The sections fetch their own.
 */
const SECTIONS = [
  { href: "/admin/itineraries", label: "Custom tour optimisation" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Wizard settings" },
  { href: "/admin/ai", label: "AI" },
  { href: "/admin/access", label: "Access" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
    /* The layout decides between the panel and the sign-in form on the
       server, so the way back to the sign-in form is to ask the server
       again — not to flip a piece of client state it cannot see. */
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-6 md:px-10 lg:py-12">
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <nav
          aria-label="Admin sections"
          className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start"
        >
          <p className="font-utility text-[11px] uppercase tracking-wide text-charcoal/40">
            Nature Walk Sri Lanka
          </p>
          <ul className="mt-3 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
            {SECTIONS.map((entry) => {
              const current = pathname === entry.href;
              return (
                <li key={entry.href} className="shrink-0 lg:shrink">
                  <Link
                    href={entry.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 w-full items-center whitespace-nowrap rounded-full px-4 text-left text-sm transition-colors lg:whitespace-normal",
                      current
                        ? "bg-forest text-warm-white"
                        : "text-charcoal/70 hover:bg-stone hover:text-charcoal"
                    )}
                  >
                    {entry.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 min-h-10 rounded-full border border-stone-dark px-4 font-utility text-xs uppercase tracking-wide text-charcoal/60 transition-colors hover:border-forest hover:text-forest"
          >
            Sign out
          </button>
        </nav>

        <section
          aria-label="Admin panel"
          className="min-w-0 rounded-2xl border border-stone-dark bg-warm-white p-5 sm:p-7 lg:p-9"
        >
          {children}
        </section>
      </div>
    </div>
  );
}
