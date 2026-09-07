import { defineRouting } from "next-intl/routing";

/**
 * The five markets Nature Walks Sri Lanka sells to. Adding a locale here means
 * adding a matching `content/<locale>/` folder — the content loader and the
 * language selector both read this list.
 */
export const locales = ["en", "nl", "es", "da", "fi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Endonyms: a Danish visitor looks for "Dansk", not "Danish". */
export const localeNames: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  es: "Español",
  da: "Dansk",
  fi: "Suomi",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
