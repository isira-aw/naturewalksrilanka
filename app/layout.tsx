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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com"),
  title: "Nature Walks Sri Lanka",
  description:
    "Private nature and wildlife journeys through Sri Lanka, with certified guides, accommodation and transport arranged by Nature Walks Sri Lanka.",
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
