"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { RequestPayload } from "@/lib/tourRequests/types";

/**
 * A traveller correcting their own contact details.
 *
 * Deliberately only these four fields. The itineraries, the dates and the
 * group size are what a quote is built from, and changing those silently
 * under a team who may already have priced them is worse than having to ask —
 * so that stays a conversation, and the form says so rather than leaving
 * somebody hunting for a button that is not there.
 *
 * The email address is shown but not editable: it is the key this enquiry is
 * matched against, so a form that could change it would let whoever holds the
 * session hand the trip to somebody else.
 */
export function ContactForm({
  reference,
  payload,
}: {
  reference: string;
  payload: RequestPayload;
}) {
  const t = useTranslations("myTrip");

  const [name, setName] = useState(payload.name);
  const [phone, setPhone] = useState(payload.phone);
  const [country, setCountry] = useState(payload.country);
  const [requirements, setRequirements] = useState(payload.requirements);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch(
        `/api/traveller/requests/${encodeURIComponent(reference)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            country: country.trim(),
            requirements: requirements.trim(),
          }),
        },
      );

      if (!response.ok) {
        setError(t("contactFailed"));
        return;
      }
      setSaved(true);
    } catch {
      setError(t("contactFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-10">
      <h2 className="font-display text-xl text-charcoal">{t("editContact")}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">{t("editContactHint")}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} value={name} onChange={setName} required />
        <Field label={t("phone")} value={phone} onChange={setPhone} type="tel" required />
        <Field label={t("country")} value={country} onChange={setCountry} />

        <label className="block">
          <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
            {t("email")}
          </span>
          <input
            type="email"
            value={payload.email}
            readOnly
            disabled
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-stone/40 px-4 text-sm text-charcoal/55"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
          {t("requirements")}
        </span>
        <textarea
          value={requirements}
          onChange={(event) => setRequirements(event.target.value)}
          rows={4}
          maxLength={4000}
          className="mt-1.5 w-full rounded-xl border border-stone-dark bg-warm-white px-4 py-3 text-sm leading-relaxed text-charcoal"
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={saving || !name.trim() || !phone.trim()}
          className="min-h-11 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          {saving ? t("savingContact") : t("saveContact")}
        </button>
        {saved && <span className="text-sm text-charcoal/55">{t("contactSaved")}</span>}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-4 text-sm text-charcoal"
      />
    </label>
  );
}
