import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
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

/* Search Console's HTML-tag method. Set once the property is claimed; left
   unset the meta tag is simply omitted, which is what every environment other
   than production wants — a staging deployment should not be claiming the
   production property. The token identifies the property, it authorises
   nothing, so it is safe as a NEXT_PUBLIC_ value. */
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com"),
  title: "Nature Walks Sri Lanka",
  description:
    "Private nature and wildlife journeys through Sri Lanka, with certified guides, accommodation and transport arranged by Nature Walks Sri Lanka.",
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
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
