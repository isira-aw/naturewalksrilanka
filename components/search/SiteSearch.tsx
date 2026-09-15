"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { SearchDoc } from "@/app/api/search/route";

/**
 * Search across the whole site.
 *
 * Everything searchable here is content-file prose fixed at build time — four
 * journeys, fifteen destinations, the activities and the section pages. That
 * is small enough that matching in the browser over a fetched index beats any
 * search service: no backend, no index to keep in step, no query latency, and
 * it keeps working with Firebase unconfigured.
 *
 * The index is fetched once, on first open, and kept for the session. It is
 * not part of any page's payload, so a visitor who never searches never pays
 * for it.
 *
 * Matching is deliberately plain: every word you type must appear somewhere
 * in the document. No fuzzy matching and no stemming — across five languages
 * those need per-language rules, and getting them subtly wrong produces
 * confidently irrelevant results, which is worse than none.
 */

type Labels = {
  open: string;
  title: string;
  placeholder: string;
  empty: string;
  error: string;
  loading: string;
  close: string;
  groups: Record<SearchDoc["g"], string>;
};

function score(doc: SearchDoc, words: string[]): number {
  const title = doc.t.toLowerCase();
  let total = 0;
  for (const word of words) {
    if (!doc.k.includes(word)) return 0; // every word must appear somewhere
    /* A hit in the title is what the visitor most likely meant, and a title
       that *starts* with the word even more so. */
    if (title.startsWith(word)) total += 6;
    else if (title.includes(word)) total += 4;
    else total += 1;
  }
  return total;
}

export function SiteSearch({ locale, labels }: { locale: string; labels: Labels }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /* So focus goes back where it came from on close, rather than to the top
     of the document. */
  const openerRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    if (docs || failed) return;
    try {
      const response = await fetch(`/api/search?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { docs: SearchDoc[] };
      setDocs(body.docs);
    } catch {
      /* The index is an enhancement; the site's navigation still works. Say
         so rather than leaving an empty box that looks broken. */
      setFailed(true);
    }
  }, [docs, failed, locale]);

  const show = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
    void load();
  }, [load]);

  const hide = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    openerRef.current?.focus?.();
  }, []);

  /* Cmd/Ctrl-K from anywhere, which is what anyone who uses search expects. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) hide();
        else show();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, hide]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!docs || words.length === 0) return [];
    return docs
      .map((doc) => ({ doc, rank: score(doc, words) }))
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 12)
      .map((entry) => entry.doc);
  }, [docs, query]);

  function go(doc: SearchDoc) {
    hide();
    /* The index stores locale-prefixed paths, and this router prefixes the
       locale itself — so strip it rather than ending up at /en/en/tours. */
    router.push(doc.h.replace(new RegExp(`^/${locale}`), "") || "/");
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") return hide();
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = results[active];
      if (chosen) go(chosen);
    }
  }

  /* Keep the highlighted row in view when arrowing past the fold. */
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={labels.open}
        className="flex h-11 min-w-11 items-center justify-center rounded-full text-charcoal/70 transition-colors hover:text-forest print:hidden"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="7" cy="7" r="5" />
          <path d="m11 11 4 4" strokeLinecap="round" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-charcoal/70 p-4 pt-[8vh] sm:p-6 sm:pt-[12vh]"
            onClick={hide}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={labels.title}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-warm-white shadow-[0_24px_64px_rgba(28,30,27,0.3)]"
            >
              <div className="flex items-center gap-3 border-b border-stone-dark px-4 sm:px-5">
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-charcoal/40" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" />
                  <path d="m11 11 4 4" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    /* Reset the highlight here rather than in an effect on
                       `query`: this is the only place the query changes, and
                       an effect would cost a second render per keystroke. */
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder={labels.placeholder}
                  aria-label={labels.title}
                  aria-controls="site-search-results"
                  autoComplete="off"
                  className="h-14 min-w-0 flex-1 bg-transparent text-base text-charcoal outline-none placeholder:text-charcoal/40"
                />
                <button
                  type="button"
                  onClick={hide}
                  aria-label={labels.close}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal/50 transition-colors hover:bg-stone hover:text-charcoal"
                >
                  <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {failed ? (
                  <p className="px-5 py-8 text-center text-sm text-charcoal/60">{labels.error}</p>
                ) : !docs ? (
                  <p className="px-5 py-8 text-center text-sm text-charcoal/50">{labels.loading}</p>
                ) : query.trim() === "" ? null : results.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-charcoal/60">{labels.empty}</p>
                ) : (
                  <ul id="site-search-results" ref={listRef} role="listbox" aria-label={labels.title}>
                    {results.map((doc, index) => (
                      <li key={`${doc.h}-${doc.t}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === active}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => go(doc)}
                          className={cn(
                            "flex w-full items-baseline gap-3 px-5 py-3 text-left transition-colors",
                            index === active ? "bg-forest/10" : "hover:bg-stone/50",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-charcoal">
                              {doc.t}
                            </span>
                            {doc.s && (
                              <span className="mt-0.5 block truncate text-xs text-charcoal/55">
                                {doc.s}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 font-utility text-[10px] uppercase tracking-wide text-charcoal/40">
                            {labels.groups[doc.g]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
