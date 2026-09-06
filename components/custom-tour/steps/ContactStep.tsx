"use client";

import { useTranslations } from "next-intl";
import { StepHeading } from "./StepHeading";

type ContactField = "name" | "email" | "phone" | "country" | "requirements";

const inputClasses =
  "mt-2 min-h-12 w-full rounded-xl border border-stone-dark bg-warm-white px-4 py-3 text-charcoal transition-colors placeholder:text-charcoal/35 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest";

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
      <StepHeading as="legend" title={t("steps.contact")} hint={t("contactHint")} />

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          id="contact-name"
          label={t("contactName")}
          value={name}
          onChange={(v) => onChange("name", v)}
          autoComplete="name"
          required
          requiredLabel={t("required")}
        />
        <Field
          id="contact-email"
          type="email"
          inputMode="email"
          label={t("contactEmail")}
          value={email}
          onChange={(v) => onChange("email", v)}
          autoComplete="email"
          required
          requiredLabel={t("required")}
        />
        <Field
          id="contact-phone"
          type="tel"
          inputMode="tel"
          label={t("contactPhone")}
          value={phone}
          onChange={(v) => onChange("phone", v)}
          autoComplete="tel"
          required
          requiredLabel={t("required")}
        />
        <Field
          id="contact-country"
          label={t("contactCountry")}
          value={country}
          onChange={(v) => onChange("country", v)}
          autoComplete="country-name"
          optionalLabel={t("optional")}
        />
      </div>

      <div className="mt-6">
        <label
          htmlFor="contact-requirements"
          className="block font-utility text-xs uppercase tracking-wide text-charcoal/55"
        >
          {t("requirementsLabel")}
          <span className="ml-2 normal-case tracking-normal text-charcoal/40">{t("optional")}</span>
        </label>
        <textarea
          id="contact-requirements"
          value={requirements}
          onChange={(e) => onChange("requirements", e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-xl border border-stone-dark bg-warm-white p-4 text-sm text-charcoal transition-colors focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        />
      </div>
    </fieldset>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  required,
  requiredLabel,
  optionalLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "email" | "tel";
  autoComplete?: string;
  required?: boolean;
  requiredLabel?: string;
  optionalLabel?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-utility text-xs uppercase tracking-wide text-charcoal/55"
      >
        {label}
        {required && requiredLabel && (
          <span className="ml-2 normal-case tracking-normal text-clay">{requiredLabel}</span>
        )}
        {!required && optionalLabel && (
          <span className="ml-2 normal-case tracking-normal text-charcoal/40">{optionalLabel}</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={inputClasses}
      />
    </div>
  );
}
