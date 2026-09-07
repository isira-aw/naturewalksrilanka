import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowLink, Kicker, Rise } from "@/components/ui/motion";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const seo = await getContent(locale as Locale, "seo");
  const page = seo.pages.contact;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/${locale}/contact`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/contact`])
      ),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      images: [seo.ogImage],
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, navigation, seo] = await Promise.all([
    getTranslations({ locale: l }),
    getContent(l, "navigation"),
    getContent(l, "seo"),
  ]);

  const page = seo.pages.contact;

  return (
    <>
      <PageHero
        eyebrow={t("finalCta.eyebrow")}
        title={page.title}
        lead={page.description}
        image={{
          src: "/images/story-2.jpg",
          alt: "A photography group in the Sinharaja rainforest",
        }}
        height="short"
      />

      <section className="bg-warm-white py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <Kicker>{t("whatsapp.talkToUs")}</Kicker>
              <Rise delay={0.1}>
                <p className="mt-8 text-xl leading-relaxed text-charcoal/80">
                  {t("finalCta.subtitle")}
                </p>
              </Rise>
              <Rise delay={0.2}>
                <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <WhatsAppCTA
                    phone={navigation.contact.whatsappNumber}
                    message={buildGeneralMessage()}
                    variant="primary"
                    size="lg"
                  >
                    {t("whatsapp.talkToUs")}
                  </WhatsAppCTA>
                  <ArrowLink href="/custom-tour">{t("customTour.start")}</ArrowLink>
                </div>
              </Rise>
            </div>

            <Rise delay={0.15} className="md:col-span-7">
              <dl className="border-t border-charcoal/15">
                <div className="grid gap-1 border-b border-charcoal/15 py-6 md:grid-cols-12 md:gap-8">
                  <dt className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45 md:col-span-4">
                    {t("customTour.contactEmail")}
                  </dt>
                  <dd className="text-lg text-charcoal md:col-span-8">
                    <a
                      href={`mailto:${navigation.contact.email}`}
                      className="transition-colors hover:text-forest"
                    >
                      {navigation.contact.email}
                    </a>
                  </dd>
                </div>
                <div className="grid gap-1 border-b border-charcoal/15 py-6 md:grid-cols-12 md:gap-8">
                  <dt className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45 md:col-span-4">
                    {t("customTour.contactPhone")}
                  </dt>
                  <dd className="text-lg text-charcoal md:col-span-8">
                    <a
                      href={`tel:${navigation.contact.phone}`}
                      className="transition-colors hover:text-forest"
                    >
                      {navigation.contact.phone}
                    </a>
                  </dd>
                </div>
                <div className="grid gap-1 border-b border-charcoal/15 py-6 md:grid-cols-12 md:gap-8">
                  <dt className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45 md:col-span-4">
                    {t("common.addressLabel")}
                  </dt>
                  <dd className="text-lg text-charcoal md:col-span-8">
                    {navigation.contact.address}
                  </dd>
                </div>
              </dl>
            </Rise>
          </div>
        </div>
      </section>
    </>
  );
}
