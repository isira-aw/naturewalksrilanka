import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowLink, Kicker } from "@/components/ui/motion";
import { TourRow } from "@/components/tours/TourRow";
import { PlanCta } from "@/components/whatsapp/PlanCta";

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

  const [t, tours, navigation, seo] = await Promise.all([
    getTranslations({ locale: l }),
    getContent(l, "tours"),
    getContent(l, "navigation"),
    getContent(l, "seo"),
  ]);

  return (
    <>
      <PageHero
        eyebrow={t("tours.sectionEyebrow")}
        title={t("tours.sectionTitle")}
        lead={seo.pages.tours.description}
        image={{
          src: "/images/tours/tour-16-days.jpg",
          alt: "Travellers at the Lion Rock stairway, Sigiriya",
        }}
        meta={tours.map((tour) => `${tour.durationDays} ${t("tours.daysLabel")}`)}
      />

      <section className="bg-warm-white py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
          <div className="max-w-2xl">
            <Kicker>{t("home.journeysCta")}</Kicker>
          </div>

          <div className="mt-12">
            {tours.map((tour, index) => (
              <TourRow
                key={tour.slug}
                tour={tour}
                index={index}
                labels={{
                  cta: t("tours.cta"),
                  daysLabel: t("tours.daysLabel"),
                  highlightsTitle: t("tours.highlightsTitle"),
                }}
              />
            ))}
          </div>

          <ArrowLink href="/custom-tour" className="mt-14">
            {t("tours.custom")}
          </ArrowLink>
        </div>
      </section>

      <PlanCta
        whatsappNumber={navigation.contact.whatsappNumber}
        labels={{
          eyebrow: t("finalCta.eyebrow"),
          title: t("finalCta.title"),
          subtitle: t("finalCta.subtitle"),
          cta: t("whatsapp.finalCta"),
        }}
        secondary={{ href: "/custom-tour", label: t("customTour.start") }}
      />
    </>
  );
}
