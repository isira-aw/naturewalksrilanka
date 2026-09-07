import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NandanaIntro } from "@/components/nandana/NandanaIntro";
import { WhyNandana } from "@/components/nandana/WhyNandana";
import { FinalCTA } from "@/components/whatsapp/FinalCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPersonJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const seo = await getContent(locale as Locale, "seo");
  const page = seo.pages.aboutNandana;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/${locale}/about-nandana`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/about-nandana`])
      ),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      images: [seo.ogImage],
    },
  };
}

export default async function AboutNandanaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, tCommon, profile, navigation] = await Promise.all([
    getTranslations({ locale: l }),
    getTranslations({ locale: l, namespace: "common" }),
    getContent(l, "profile"),
    getContent(l, "navigation"),
  ]);

  const whyPoints = t.raw("nandana.whyPoints") as { title: string; description: string }[];
  // profile.stats is authored as [Years Guiding, Languages, His Home] in every locale.
  const languagesLabel = profile.stats[1]?.label ?? "Languages";

  return (
    <>
      <JsonLd data={buildPersonJsonLd({ profile, locale: l })} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("nav.home"), url: `/${l}` },
          { name: t("nav.aboutNandana"), url: `/${l}/about-nandana` },
        ])}
      />

      <Section tone="warm" size="compact" className="pb-0 md:pb-0">
        <SectionHeading eyebrow={t("nandana.introEyebrow")} title={profile.name} />
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-charcoal/70">
          {profile.philosophy}
        </p>

        <dl className="mt-10 grid gap-8 border-t border-stone-dark pt-8 sm:grid-cols-3">
          <div>
            <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
              {t("nandana.experienceLabel")}
            </dt>
            <dd className="mt-2 text-charcoal/80">{profile.experience}</dd>
          </div>
          <div>
            <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
              {languagesLabel}
            </dt>
            <dd className="mt-2 text-charcoal/80">
              {profile.languages.length > 0
                ? profile.languages.join(", ")
                : tCommon("contentRequired")}
            </dd>
          </div>
          <div>
            <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
              {t("nandana.certificationLabel")}
            </dt>
            <dd className="mt-2 text-charcoal/80">{profile.certification}</dd>
          </div>
        </dl>
      </Section>

      <NandanaIntro profile={profile} title={t("nandana.introTitle")} />

      <WhyNandana
        profile={profile}
        eyebrow={t("nandana.whyEyebrow")}
        title={t("nandana.whyTitle")}
        points={whyPoints}
      />

      <FinalCTA
        whatsappNumber={navigation.contact.whatsappNumber}
        labels={{
          eyebrow: t("finalCta.eyebrow"),
          title: t("finalCta.title"),
          subtitle: t("finalCta.subtitle"),
          cta: t("whatsapp.talkToUs"),
        }}
        secondary={{ href: "/custom-tour", label: t("customTour.start") }}
      />
    </>
  );
}
