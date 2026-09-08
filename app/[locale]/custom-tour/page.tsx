import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { PageHero } from "@/components/ui/PageHero";
import { WizardShell } from "@/components/custom-tour/WizardShell";
import { isAiAssistantEnabled } from "@/lib/ai/config";

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

  const [t, navigation, experiences] = await Promise.all([
    getTranslations({ locale: l, namespace: "customTour" }),
    getContent(l, "navigation"),
    getContent(l, "experiences"),
  ]);

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        /* PageHero breaks the title on newlines, which keeps the authored
           two-line break from the content file. */
        title={`${t("titleLine1")}\n${t("titleLine2")}`}
        lead={t("intro")}
        image={{
          src: "/images/story-1.jpg",
          alt: "Birding on a forest trail in Sri Lanka's highlands",
        }}
        height="short"
      />

      {/* Wider than the site container and not max-w-3xl: every step lays itself
          out across the full column — the calendar shows two months, the AI
          assistant renders a map, the itineraries sit in a grid — and the
          progress rail takes its own column on desktop. */}
      <section className="bg-stone/25 py-10 md:py-14 lg:py-16">
        <div className="mx-auto w-full max-w-[92rem] px-4 sm:px-6 md:px-10 xl:px-12">
          <WizardShell
            locale={l}
            whatsappNumber={navigation.contact.whatsappNumber}
            experiences={experiences}
            aiAssistantEnabled={isAiAssistantEnabled()}
          />
        </div>
      </section>
    </>
  );
}
