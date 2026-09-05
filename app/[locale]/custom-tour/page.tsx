import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WizardShell } from "@/components/custom-tour/WizardShell";

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
  const page = seo.pages.customTour;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/${locale}/custom-tour`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/custom-tour`])),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      images: [seo.ogImage],
    },
  };
}

export default async function CustomTourPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, navigation] = await Promise.all([
    getTranslations({ locale: l, namespace: "customTour" }),
    getContent(l, "navigation"),
  ]);

  return (
    <Section tone="warm">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={
          <>
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </>
        }
      />
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-charcoal/70">{t("intro")}</p>

      <div className="mt-12 max-w-3xl">
        <WizardShell locale={l} whatsappNumber={navigation.contact.whatsappNumber} />
      </div>
    </Section>
  );
}
