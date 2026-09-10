import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { PageHero } from "@/components/ui/PageHero";
import { Kicker, Rise } from "@/components/ui/motion";
import { DestinationIndex } from "@/components/destinations/DestinationIndex";
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

  const [t, destinations, navigation] = await Promise.all([
    getTranslations({ locale: l }),
    getContent(l, "destinations"),
    getContent(l, "navigation"),
  ]);

  return (
    <>
      <PageHero
        eyebrow={t("sriLanka.eyebrow")}
        title={t("tours.destinationsTitle")}
        lead={t("sriLanka.body")}
        image={{
          src: "/images/destinations/destinations.jpg",
          alt: "Dry-zone landscape in Sri Lanka's north west",
        }}
      />

      <section className="bg-warm-white py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
          <div className="max-w-2xl">
            <Kicker>{t("home.placesCta")}</Kicker>
            <Rise delay={0.1}>
              <h2 className="mt-6 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
                {t("sriLanka.title")}
              </h2>
            </Rise>
          </div>

          <div className="mt-14">
            <DestinationIndex
              destinations={destinations}
              labels={{
                all: t("destinations.allRegions"),
                count: t("destinations.count"),
              }}
            />
          </div>
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
