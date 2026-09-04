import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const seo = await getContent(locale as Locale, "seo");
  const title = `Privacy Policy | ${seo.siteName}`;
  const description =
    "How Nature Walks Sri Lanka handles the information you share when planning a tour.";
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/privacy`])
      ),
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <section className="bg-warm-white py-4 pb-24 pt-16 md:pb-32 md:pt-20">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow="Legal" title="Privacy Policy" />

        <p className="mt-8 rounded-sm border border-clay/40 bg-clay/10 px-5 py-4 text-sm text-charcoal/80">
          This is a placeholder privacy policy pending final legal review. It describes, in plain
          language, what currently happens with your information — it is not a substitute for a
          reviewed legal document.
        </p>

        <div className="mt-10 space-y-8 text-charcoal/80">
          <div>
            <h2 className="font-display text-2xl text-charcoal">What we collect</h2>
            <p className="mt-3 leading-relaxed">
              Nature Walks Sri Lanka does not run a server-side database of visitor or customer
              information. When you use the custom-tour planner on this site, the name, email
              address, and phone number you type into the form are used only to compose a WhatsApp
              message on your own device, addressed to Nandana Hewagamage. That message is sent
              directly from your phone or browser to WhatsApp — it is not stored on, or transmitted
              through, a server or database operated by this website.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-charcoal">What happens after that</h2>
            <p className="mt-3 leading-relaxed">
              Once your message reaches WhatsApp, it is handled under WhatsApp&rsquo;s own privacy
              policy, and any reply from Nandana becomes a normal WhatsApp conversation between you
              and him. This site has no visibility into, or control over, that conversation.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-charcoal">Basic technical data</h2>
            <p className="mt-3 leading-relaxed">
              Standard hosting and analytics infrastructure may log routine technical information
              (such as page requests) in the ordinary course of serving this website. No such data
              is used to build customer profiles or sold to third parties.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-charcoal">Questions</h2>
            <p className="mt-3 leading-relaxed">
              If you have questions about this policy, please contact Nandana directly using the
              details on the Contact page.
            </p>
          </div>
        </div>

        <p className="mt-12 border-t border-stone-dark pt-6 text-sm text-charcoal/50">
          This page is currently published in English only. A localized version in German and
          French, and a final legal review, are both pending.
        </p>
      </Container>
    </section>
  );
}
