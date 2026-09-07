import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Container } from "@/components/ui/Container";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function Footer({ locale }: { locale: Locale }) {
  const [navigation, t] = await Promise.all([
    getContent(locale, "navigation"),
    getTranslations({ locale, namespace: "footer" }),
  ]);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-dark/60 bg-charcoal text-warm-white">
      <Container className="grid grid-cols-1 gap-10 py-16 sm:grid-cols-2 sm:gap-8 md:grid-cols-4 md:gap-12">
        <div className="sm:col-span-2">
          <Image
            src="/logo.svg"
            alt="Nature Walks Sri Lanka"
            width={200}
            height={40}
            /* brightness-0 first, so the mark goes white rather than
               inverting green to magenta on the dark footer. */
            className="h-8 w-auto brightness-0 invert"
          />
          <p className="mt-4 max-w-sm text-sm text-warm-white/70">{t("tagline")}</p>
          <div className="mt-6 flex gap-4 text-sm text-warm-white/70">
            {navigation.social.facebook && (
              <a href={navigation.social.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-warm-white">
                Facebook
              </a>
            )}
            {navigation.social.instagram && (
              <a href={navigation.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-warm-white">
                Instagram
              </a>
            )}
            {navigation.social.youtube && (
              <a href={navigation.social.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-warm-white">
                YouTube
              </a>
            )}
          </div>
        </div>

        <div>
          <p className="font-utility text-xs uppercase tracking-wide text-warm-white/50">
            {t("navigation")}
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {navigation.main.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-warm-white/80 hover:text-warm-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-utility text-xs uppercase tracking-wide text-warm-white/50">
            {t("contact")}
          </p>
          <ul className="mt-4 space-y-3 text-sm text-warm-white/80">
            <li>{navigation.contact.address}</li>
            <li className="break-words">
              <a href={`mailto:${navigation.contact.email}`} className="hover:text-warm-white">
                {navigation.contact.email}
              </a>
            </li>
            <li>
              <a href={`tel:${navigation.contact.phone.replace(/\s/g, "")}`} className="hover:text-warm-white">
                {navigation.contact.phone}
              </a>
            </li>
          </ul>
          <div className="mt-6">
            <p className="mb-2 font-utility text-xs uppercase tracking-wide text-warm-white/50">
              {t("language")}
            </p>
            <LocaleSwitcher tone="inverted" label={t("language")} className="max-w-44" />
          </div>
        </div>
      </Container>

      <div className="border-t border-warm-white/10 py-6">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-warm-white/50 md:flex-row">
          <p>
            © {year} Nature Walks Sri Lanka. {t("rights")}
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-warm-white/80">
              {t("privacy")}
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
