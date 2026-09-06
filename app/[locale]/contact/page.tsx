import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
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
    <Section tone="warm" containerClassName="max-w-3xl">
      <SectionHeading eyebrow={t("finalCta.eyebrow")} title={page.title} />
      <p className="mt-6 text-lg leading-relaxed text-charcoal/70">{page.description}</p>

      <dl className="mt-12 space-y-6 border-t border-stone-dark pt-8">
        <div>
          <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
            {t("customTour.contactEmail")}
          </dt>
          <dd className="mt-1 text-lg text-charcoal">
            <a href={`mailto:${navigation.contact.email}`} className="hover:text-forest">
              {navigation.contact.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
            {t("customTour.contactPhone")}
          </dt>
          <dd className="mt-1 text-lg text-charcoal">
            <a href={`tel:${navigation.contact.phone}`} className="hover:text-forest">
              {navigation.contact.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
            {t("common.addressLabel")}
          </dt>
          <dd className="mt-1 text-lg text-charcoal">{navigation.contact.address}</dd>
        </div>
      </dl>

      <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
        <WhatsAppCTA
          phone={navigation.contact.whatsappNumber}
          message={buildGeneralMessage()}
          variant="primary"
          size="lg"
        >
          {t("whatsapp.talkToUs")}
        </WhatsAppCTA>
        <Link
          href="/custom-tour"
          className="font-medium text-forest underline underline-offset-8 transition-colors hover:text-forest-dark"
        >
          {t("customTour.start")}
        </Link>
      </div>
    </Section>
  );
}
