import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DestinationGrid } from "@/components/destinations/DestinationGrid";

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
  const page = seo.pages.destinations;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/${locale}/destinations`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/destinations`])
      ),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      images: [seo.ogImage],
    },
  };
}

export default async function DestinationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, destinations] = await Promise.all([
    getTranslations({ locale: l }),
    getContent(l, "destinations"),
  ]);

  return (
    <Section tone="warm">
      <SectionHeading eyebrow={t("sriLanka.eyebrow")} title={t("tours.destinationsTitle")} />
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-charcoal/70">
        {t("sriLanka.body")}
      </p>
      <div className="mt-12">
        <DestinationGrid destinations={destinations} />
      </div>
    </Section>
  );
}
