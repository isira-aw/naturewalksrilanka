import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PageHero } from "@/components/ui/PageHero";
import { Rise } from "@/components/ui/motion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const seo = await getContent(locale as Locale, "seo");
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/privacy",
    title: `Privacy Policy | ${seo.siteName}`,
    description:
      "How Nature Walks Sri Lanka handles the information you share when planning a tour.",
    seo,
  });
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
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        image={{
          src: "/images/story-2.jpg",
          alt: "A photography group in the Sinharaja rainforest",
        }}
        height="short"
      />

      <section className="bg-warm-white pb-24 pt-16 md:pb-32 md:pt-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-10">
        <p className="border-l-2 border-clay bg-clay/10 px-5 py-4 text-sm text-charcoal/80">
          This page describes, accurately and in plain language, what this
          website does with your information. It has <strong>not</strong> been
          through legal review, and the points listed at the end &mdash; how
          long things are kept, and how to ask for them back or deleted
          &mdash; are not settled yet. It is not a substitute for a reviewed
          legal document.
        </p>

        <div className="mt-12 space-y-10 text-charcoal/80">
          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">The short version</h2>
            <p className="mt-3 leading-relaxed">
              This site keeps a copy of what you send it. If you plan a tour
              here, your enquiry is stored in a database run by Nature Walks
              Sri Lanka, so that the team has a record of it and so that you
              can look it up again later. Nothing is sold, nothing is used to
              advertise to you, and there is no tracking of any kind: at the
              time of writing this site runs no analytics and sets no cookie
              at all unless you sign in.
            </p>
          </Rise>

          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">
              Planning a tour
            </h2>
            <p className="mt-3 leading-relaxed">
              The custom-tour planner ends by opening a WhatsApp message,
              addressed to Nandana Hewagamage, that you send yourself from your
              own device. Once it reaches WhatsApp it is handled under
              WhatsApp&rsquo;s own privacy policy, and Nandana&rsquo;s reply is
              an ordinary WhatsApp conversation between the two of you; this
              site has no visibility into it.
            </p>
            <p className="mt-3 leading-relaxed">
              At the same moment, a copy of the enquiry is saved to this
              site&rsquo;s database. That copy holds the name, email address,
              phone number and country you entered, anything you wrote in the
              free-text box, the number of travellers, your dates, the
              itineraries you chose and your accommodation preferences. It also
              holds the itinerary document as it stood when you sent it, and a
              note of which take-away files you downloaded and when. If you
              later correct your contact details, the previous version is kept
              alongside the new one, so the team can tell what the enquiry said
              when they quoted against it.
            </p>
          </Rise>

          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">
              Looking up your own trip
            </h2>
            <p className="mt-3 leading-relaxed">
              You can sign in at <em>My trip</em> to see the enquiries sent from
              your email address and to correct your contact details. Signing in
              is by a one-time link sent to that address; doing so creates an
              account for the address with Google&rsquo;s Firebase
              Authentication and sets one cookie on your device, which lasts a
              fortnight. Your email address is the key those enquiries are
              matched against, which is why the form will not let you change it.
            </p>
          </Rise>

          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">
              The other things this site stores
            </h2>
            <p className="mt-3 leading-relaxed">
              <strong>Newsletter.</strong> If you sign up, your email address,
              the language you were reading and the date are stored. Nothing
              else.
            </p>
            <p className="mt-3 leading-relaxed">
              <strong>Reviews.</strong> Reviews are by invitation. An invitation
              records the address it was sent to and who sent it; a submitted
              review records the name and country you give, your rating, what
              you wrote, any photographs you attach, and &mdash; once a staff
              member has approved or declined it &mdash; who did so and when.
              An approved review is published on this site.
            </p>
            <p className="mt-3 leading-relaxed">
              <strong>While you are still typing.</strong> An unfinished plan is
              saved in your own browser, on your own device, so that a closed
              tab does not lose it. It is not sent anywhere until you send the
              enquiry, and clearing your browser data removes it.
            </p>
            <p className="mt-3 leading-relaxed">
              <strong>Spam protection.</strong> To stop the enquiry form being
              used in bulk, and to stop anyone guessing their way into other
              people&rsquo;s trips, the site counts how many enquiries and how
              many attempts to open a trip have recently come from a given
              internet connection. It stores counts only: your IP address is
              not written down, and neither is anything from which it could be
              worked out.
            </p>
          </Rise>

          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">
              Who else is involved
            </h2>
            <p className="mt-3 leading-relaxed">
              The site is hosted by Vercel, and the database and sign-in are
              Google&rsquo;s Firebase. Both log routine technical information,
              such as page requests, in the ordinary course of running a
              website. Photographs are served by Cloudinary. The map in the
              journey planner draws its tiles from OpenStreetMap and its
              driving routes from the OSRM routing service, so when you reach
              that step those two services see the request your browser makes
              to them.
            </p>
            <p className="mt-3 leading-relaxed">
              There is one use of artificial intelligence on this site: a staff
              member can have an itinerary&rsquo;s own description translated
              into another language. Only that published description is sent.
              No enquiry, name, email address, phone number or review has ever
              been sent to an AI model, and there is no part of the site that
              could send one.
            </p>
          </Rise>

          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">
              Still to be settled
            </h2>
            <p className="mt-3 leading-relaxed">
              These are questions about how the business runs, not about how
              the website works, and they are deliberately left blank rather
              than filled in with something plausible:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                Who is formally responsible for this information, and the
                address to write to about it.
              </li>
              <li>How long each of the things above is kept before deletion.</li>
              <li>
                The legal basis relied on for storing them, and, for visitors in
                the EU and UK, how to ask for a copy of what is held, ask for it
                to be corrected or deleted, and complain if the answer is
                unsatisfactory.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Until they are answered here, please ask Nandana directly using
              the details on the Contact page &mdash; a request made that way
              will be honoured.
            </p>
          </Rise>

          <Rise>
            <h2 className="font-display text-2xl text-charcoal md:text-3xl">Questions</h2>
            <p className="mt-3 leading-relaxed">
              If you have questions about this policy, please contact Nandana
              directly using the details on the Contact page.
            </p>
          </Rise>
        </div>

        <p className="mt-14 border-t border-charcoal/15 pt-6 text-sm text-charcoal/50">
          This page is currently published in English only. Localized versions in Dutch, Spanish,
          Danish and Finnish, and a final legal review, are both pending.
        </p>
        </div>
      </section>
    </>
  );
}
