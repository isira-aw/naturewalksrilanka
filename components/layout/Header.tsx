import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Container } from "@/components/ui/Container";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { PersonIcon, type HeaderCta } from "./HeaderCta";
import { hasSavedTour } from "@/lib/tourRequests/savedTour";
import { SiteSearch } from "@/components/search/SiteSearch";

export async function Header({ locale }: { locale: Locale }) {
  const [navigation, t, tSearch, tMyTrip, savedTour] = await Promise.all([
    getContent(locale, "navigation"),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "search" }),
    /* The label lives with the page it points at, so the header and that
       page's own heading cannot drift apart. */
    getTranslations({ locale, namespace: "myTrip" }),
    hasSavedTour(),
  ]);

  /* One button, two jobs. Somebody with a tour saved is here to look at it;
     everybody else is here to plan one. `navigation.json` still owns the
     wizard's wording, so the business can reword its own call to action. */
  const cta: HeaderCta = savedTour
    ? { href: "/my-trip", label: tMyTrip("navLabel"), isTour: true }
    : { href: navigation.primaryCta.href, label: navigation.primaryCta.label, isTour: false };

  /* Read on the server so the dialog ships with its copy already translated —
     it is a client component and has no access to the message catalogue. */
  const searchLabels = {
    open: tSearch("open"),
    title: tSearch("title"),
    placeholder: tSearch("placeholder"),
    empty: tSearch("empty"),
    error: tSearch("error"),
    loading: tSearch("loading"),
    close: tSearch("close"),
    groups: {
      tour: tSearch("groups.tour"),
      destination: tSearch("groups.destination"),
      activity: tSearch("groups.activity"),
      page: tSearch("groups.page"),
    },
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-dark/60 bg-warm-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Nature Walks Sri Lanka — home"
        >
          <Image
            src="/logo.svg"
            alt="Nature Walks Sri Lanka"
            width={200}
            height={40}
            priority
            className="h-7 w-auto lg:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8" aria-label="Primary">
          <NavLinks items={navigation.main} />
        </nav>

        {/* Mounted once, not once per breakpoint: each instance registers a
            global Cmd/Ctrl-K listener and renders its own portal, so two of
            them opened two stacked dialogs. It sits in the flex row and lands
            beside the language switcher on desktop and beside Menu on
            mobile, which is where it is wanted in both cases. */}
        <div className="ml-auto flex items-center lg:ml-0">
          <SiteSearch locale={locale} labels={searchLabels} />
        </div>

        <div className="hidden items-center gap-4 lg:flex xl:gap-6">
          <LocaleSwitcher label={t("language")} className="w-36" />
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-forest px-4 py-2.5 font-utility text-xs uppercase tracking-wide text-forest transition-colors hover:bg-forest hover:text-warm-white xl:px-5"
          >
            {cta.isTour && <PersonIcon className="h-4 w-4" />}
            {cta.label}
          </Link>
        </div>

        <div className="flex items-center lg:hidden">
          <MobileNav
            navigation={navigation}
            cta={cta}
            labels={{
              menu: t("menu"),
              close: t("close"),
              language: t("language"),
            }}
          />
        </div>
      </Container>
    </header>
  );
}
