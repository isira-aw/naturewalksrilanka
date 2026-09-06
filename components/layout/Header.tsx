import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Container } from "@/components/ui/Container";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";

export async function Header({ locale }: { locale: Locale }) {
  const [navigation, t] = await Promise.all([
    getContent(locale, "navigation"),
    getTranslations({ locale, namespace: "nav" }),
  ]);

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

        <div className="hidden items-center gap-4 lg:flex xl:gap-6">
          <LocaleSwitcher label={t("language")} className="w-36" />
          <Link
            href={navigation.primaryCta.href}
            className="whitespace-nowrap rounded-full border border-forest px-4 py-2.5 font-utility text-xs uppercase tracking-wide text-forest transition-colors hover:bg-forest hover:text-warm-white xl:px-5"
          >
            {navigation.primaryCta.label}
          </Link>
        </div>

        <MobileNav
          navigation={navigation}
          labels={{
            menu: t("menu"),
            close: t("close"),
            primaryCta: navigation.primaryCta.label,
            language: t("language"),
          }}
        />
      </Container>
    </header>
  );
}
