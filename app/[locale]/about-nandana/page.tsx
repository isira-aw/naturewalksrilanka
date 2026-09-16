import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { publishedTestimonials } from "@/lib/reviews/published";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PageHero } from "@/components/ui/PageHero";
import { Kicker, Rise } from "@/components/ui/motion";
import { NandanaStory } from "@/components/nandana/NandanaStory";
import { WhyNandana } from "@/components/nandana/WhyNandana";
import { ConservationNote } from "@/components/nandana/ConservationNote";
import { VoicesSlider } from "@/components/home/VoicesSlider";
import { PlanCta } from "@/components/whatsapp/PlanCta";
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
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/about-nandana",
    title: page.title,
    description: page.description,
    seo,
  });
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

  const [t, profile, navigation, testimonials] = await Promise.all([
    getTranslations({ locale: l }),
    getContent(l, "profile"),
    getContent(l, "navigation"),
    getContent(l, "testimonials"),
  ]);

  /* The same voices the home page shows. A traveller who has read this far is
     deciding whether to trust one particular guide, which is exactly when
     somebody else's account of travelling with him is worth reading. */
  const voices = await publishedTestimonials(testimonials, l);

  const whyPoints = t.raw("nandana.whyPoints") as { title: string; description: string }[];

  return (
    <>
      <JsonLd data={buildPersonJsonLd({ profile, locale: l })} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("nav.home"), url: `/${l}` },
          { name: t("nav.aboutNandana"), url: `/${l}/about-nandana` },
        ])}
      />

      <PageHero
        eyebrow={t("nandana.introEyebrow")}
        title={profile.name}
        lead={profile.philosophy}
        image={{
          src: "/images/hero-2.jpg",
          alt: "Birdwatching with spotting scopes beside a dry-zone lagoon",
        }}
        meta={[profile.experience, profile.certification]}
      />

      <section className="bg-warm-white pt-16 pb-4 md:pt-24 md:pb-6">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
          <Kicker>{t("destinations.atAGlance")}</Kicker>
          <Rise delay={0.1}>
            <dl className="mt-8 border-t border-charcoal/15">
              <div className="grid gap-1 border-b border-charcoal/15 py-5 md:grid-cols-12 md:gap-8">
                <dt className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45 md:col-span-3">
                  {t("nandana.experienceLabel")}
                </dt>
                <dd className="text-charcoal/80 md:col-span-9">{profile.experience}</dd>
              </div>
              {/* Which languages he guides in has never been confirmed, and a
                  row reading "to be confirmed" tells a visitor nothing while
                  suggesting the site is unfinished. Filling in `languages` in
                  profile.json is all it takes to bring the row back. */}
              {profile.languages.length > 0 && (
                <div className="grid gap-1 border-b border-charcoal/15 py-5 md:grid-cols-12 md:gap-8">
                  <dt className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45 md:col-span-3">
                    {t("nandana.languagesLabel")}
                  </dt>
                  <dd className="text-charcoal/80 md:col-span-9">
                    {profile.languages.join(", ")}
                  </dd>
                </div>
              )}
              <div className="grid gap-1 border-b border-charcoal/15 py-5 md:grid-cols-12 md:gap-8">
                <dt className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45 md:col-span-3">
                  {t("nandana.certificationLabel")}
                </dt>
                <dd className="text-charcoal/80 md:col-span-9">{profile.certification}</dd>
              </div>
            </dl>
          </Rise>
        </div>
      </section>

      <NandanaStory profile={profile} title={t("nandana.introTitle")} />

      <WhyNandana
        profile={profile}
        eyebrow={t("nandana.whyEyebrow")}
        title={t("nandana.whyTitle")}
        points={whyPoints}
      />

      <ConservationNote
        labels={{
          eyebrow: t("conservation.eyebrow"),
          title: t("conservation.title"),
          quote: t("conservation.quote"),
        }}
      />

      {voices.items.length > 0 && (
        <VoicesSlider
          testimonials={voices}
          labels={{
            eyebrow: t("testimonials.eyebrow"),
            title: t("testimonials.title"),
            emptyState: t("testimonials.emptyState"),
            gallery: {
              label: t("gallery.label"),
              close: t("gallery.close"),
              previous: t("gallery.previous"),
              next: t("gallery.next"),
            },
          }}
        />
      )}

      <PlanCta
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
