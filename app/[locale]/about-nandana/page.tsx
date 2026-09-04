import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NandanaIntro } from "@/components/nandana/NandanaIntro";
import { WhyNandana } from "@/components/nandana/WhyNandana";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";
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

      <section className="bg-warm-white py-4 pt-4 md:pb-4 md:pt-20">
        <Container>
          <SectionHeading eyebrow={t("nandana.introEyebrow")} title={profile.name} />
          <p className="mt-4 max-w-2xl font-utility text-sm uppercase tracking-wide text-charcoal/60">
            {profile.experience} · {profile.certification}
          </p>

          <dl className="mt-10 grid gap-8 border-t border-stone-dark pt-8 sm:grid-cols-3">
            <div>
              <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                {t("tours.sectionEyebrow")}
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
                {t("nandana.whyEyebrow")}
              </dt>
              <dd className="mt-2 text-charcoal/80">{profile.certification}</dd>
            </div>
          </dl>
        </Container>
      </section>

      <NandanaIntro
        profile={profile}
        eyebrow={t("nandana.introEyebrow")}
        title={t("nandana.introTitle")}
      />

      <WhyNandana
        profile={profile}
        eyebrow={t("nandana.whyEyebrow")}
        title={t("nandana.whyTitle")}
        points={whyPoints}
      />

      <section className="bg-forest py-24 text-center md:py-28">
        <Container>
          <p className="font-utility text-xs uppercase tracking-[0.2em] text-warm-white/70">
            {t("finalCta.eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-warm-white md:text-4xl">
            {t("finalCta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-warm-white/80">{t("finalCta.subtitle")}</p>
          <div className="mt-8 flex justify-center">
            <WhatsAppCTA
              phone={navigation.contact.whatsappNumber}
              message={buildGeneralMessage()}
              variant="inverted"
              size="lg"
            >
              {t("whatsapp.talkToNandana")}
            </WhatsAppCTA>
          </div>
        </Container>
      </section>
    </>
  );
}
