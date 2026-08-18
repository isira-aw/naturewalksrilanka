"use client";

import { useTranslations } from "next-intl";

type ContactField = "name" | "email" | "phone" | "country" | "requirements";

export function ContactStep({
  name,
  email,
  phone,
  country,
  requirements,
  onChange,
}: {
  name: string;
  email: string;
  phone: string;
  country: string;
  requirements: string;
  onChange: (field: ContactField, value: string) => void;
}) {
  const t = useTranslations("customTour");

  return (
    <fieldset>
      <legend className="font-display text-2xl text-charcoal">{t("steps.contact")}</legend>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block font-utility text-xs uppercase tracking-wide text-charcoal/60">
            {t("contactName")}
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            className="mt-2 w-full rounded-lg border border-charcoal/20 bg-warm-white px-4 py-3 text-sm text-charcoal focus:border-forest focus:outline-none"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block font-utility text-xs uppercase tracking-wide text-charcoal/60">
            {t("contactEmail")}
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => onChange("email", e.target.value)}
            className="mt-2 w-full rounded-lg border border-charcoal/20 bg-warm-white px-4 py-3 text-sm text-charcoal focus:border-forest focus:outline-none"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className="block font-utility text-xs uppercase tracking-wide text-charcoal/60">
            {t("contactPhone")}
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="mt-2 w-full rounded-lg border border-charcoal/20 bg-warm-white px-4 py-3 text-sm text-charcoal focus:border-forest focus:outline-none"
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="contact-country" className="block font-utility text-xs uppercase tracking-wide text-charcoal/60">
            {t("contactCountry")}
          </label>
          <input
            id="contact-country"
            type="text"
            value={country}
            onChange={(e) => onChange("country", e.target.value)}
            className="mt-2 w-full rounded-lg border border-charcoal/20 bg-warm-white px-4 py-3 text-sm text-charcoal focus:border-forest focus:outline-none"
            autoComplete="country-name"
          />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="contact-requirements" className="block font-utility text-xs uppercase tracking-wide text-charcoal/60">
          {t("requirementsLabel")}
        </label>
        <textarea
          id="contact-requirements"
          value={requirements}
          onChange={(e) => onChange("requirements", e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-xl border border-charcoal/20 bg-warm-white p-4 text-sm text-charcoal focus:border-forest focus:outline-none"
        />
      </div>
    </fieldset>
  );
}
