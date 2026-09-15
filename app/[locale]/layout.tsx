import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MotionProvider } from "@/components/layout/MotionProvider";
import { ReadingAids } from "@/components/layout/ReadingAids";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <MotionProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-warm-white"
        >
          Skip to content
        </a>
        <Header locale={locale as Locale} />
        {/* After the header so the progress bar paints over it at the same
            z-index; both stay under the z-50 nav and language overlays. */}
        <ReadingAids />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer locale={locale as Locale} />
      </MotionProvider>
    </NextIntlClientProvider>
  );
}
