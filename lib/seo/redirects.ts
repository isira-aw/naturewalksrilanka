/**
 * Maps the old static-HTML site's URLs to their new locations, so once this
 * site replaces naturewalksrilanka.com, existing search rankings and any
 * bookmarked/shared links keep working. Wired into next.config.ts redirects().
 */
export const legacyRedirects = [
  { source: "/index.html", destination: "/en" },
  { source: "/about.html", destination: "/en/about-nandana" },
  { source: "/single18.html", destination: "/en/tours/18-days" },
  { source: "/single16.html", destination: "/en/tours/16-days" },
  { source: "/single12.html", destination: "/en/tours/12-days" },
  { source: "/single10.html", destination: "/en/tours/10-days" },
  // The old site's 2-week ("single.html") and 1-week ("single7.html") tours
  // have no equivalent in the new tour lineup (18/16/12/10 days only) — send
  // them to the tours overview rather than a 404 until/unless Nandana wants
  // those durations reinstated as their own pages.
  { source: "/single.html", destination: "/en/tours" },
  { source: "/single7.html", destination: "/en/tours" },
  // German and French were dropped in favour of Dutch, Spanish, Danish and
  // Finnish; anything still pointing at the old locale prefixes lands on the
  // same page in English rather than a 404.
  { source: "/de", destination: "/en" },
  { source: "/fr", destination: "/en" },
  { source: "/de/:path*", destination: "/en/:path*" },
  { source: "/fr/:path*", destination: "/en/:path*" },
] as const;
