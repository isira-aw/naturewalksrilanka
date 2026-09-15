import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import { SITE_URL } from "@/lib/seo/site";
import "./globals.css";

const displaySerif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const bodySans = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const utilityMono = JetBrains_Mono({
  variable: "--font-utility",
  subsets: ["latin"],
});

/* ---------------------------------------------------------------------------
   SEARCH ENGINE VERIFICATION — paste your codes into `.env`, not into this file.

   Both are the HTML-tag method, and both work the same way: set the variable
   and the meta tag appears in <head>; leave it unset and no tag is rendered at
   all. That default is deliberate — a staging or preview deployment must not
   claim the production property.

   Neither token authorises anything; each merely identifies a property, which
   is why both are safe as NEXT_PUBLIC_ values.

     NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
       Google Search Console > Add property > HTML tag. Copy only the value
       inside content="...", not the whole <meta> element.
       Renders: <meta name="google-site-verification" content="...">

     NEXT_PUBLIC_BING_SITE_VERIFICATION
       Bing Webmaster Tools > Add site > HTML Meta Tag. Again, the content
       value only.
       Renders: <meta name="msvalidate.01" content="...">

   See docs/seo.md for the full post-deployment walkthrough.
--------------------------------------------------------------------------- */
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingSiteVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Nature Walks Sri Lanka",
  description:
    "Private nature and wildlife journeys through Sri Lanka, with certified guides, accommodation and transport arranged by Nature Walks Sri Lanka.",
  /* One `verification` object or none: Next merges nothing here, so the two
     tokens have to be assembled together rather than in two spreads. */
  ...(googleSiteVerification || bingSiteVerification
    ? {
        verification: {
          ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
          ...(bingSiteVerification
            ? { other: { "msvalidate.01": bingSiteVerification } }
            : {}),
        },
      }
    : {}),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${displaySerif.variable} ${bodySans.variable} ${utilityMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-warm-white text-charcoal">
        {children}
      </body>
    </html>
  );
}
