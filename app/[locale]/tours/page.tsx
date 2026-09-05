import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TourCard } from "@/components/tours/TourCard";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const seo = await getContent(locale as Locale, "seo");
  const page = seo.pages.tours;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/${locale}/tours`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/tours`])),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      images: [seo.ogImage],
    },
  };
}

export default async function ToursPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, tours] = await Promise.all([
    getTranslations({ locale: l, namespace: "tours" }),
    getContent(l, "tours"),
  ]);

  return (
    <Section tone="warm">
      <SectionHeading eyebrow={t("sectionEyebrow")} title={t("sectionTitle")} />
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <TourCard
            key={tour.slug}
            tour={tour}
            labels={{ cta: t("cta"), daysLabel: t("daysLabel") }}
          />
        ))}
      </div>
    </Section>
  );
}
