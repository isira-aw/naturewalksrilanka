"use client";

import { useEffect, useState } from "react";
import { ITINERARY_CATEGORIES } from "@/lib/itineraries/categories";
import {
  ACCOMMODATION_KEYS,
  DEFAULT_CUSTOM_TOUR_SETTINGS,
  TRAVELLER_CEILING,
  type AccommodationKey,
  type CustomTourSettings,
} from "@/lib/settings/customTour";
import type { ItineraryCategory } from "@/lib/itineraries/categories";

/**
 * The parts of the custom-tour wizard the team can change without a deploy.
 *
 * Each of these used to be a constant somewhere in the code, needing a
 * developer and a deployment to alter — which is the wrong shape for a
 * business decision. Kept deliberately small: only things there is a real
 * reason to change, and nothing whose wrong value would break the wizard
 * rather than configure it.
 */
const ACCOMMODATION_LABELS: Record<AccommodationKey, string> = {
  budget: "Budget",
  comfortable: "Comfortable",
  boutique: "Boutique",
  luxury: "Luxury",
  ecoLodge: "Eco lodge",
  recommend: "Let us recommend",
};

export function WizardSettingsPanel() {
  const [settings, setSettings] = useState<CustomTourSettings>(
    DEFAULT_CUSTOM_TOUR_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/settings", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!response.ok) {
          setError("Could not load the wizard settings.");
          setLoading(false);
          return;
        }
        const data = (await response.json()) as { settings: CustomTourSettings };
        if (cancelled) return;
        setSettings(data.settings);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not reach the server.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function patch(changes: Partial<CustomTourSettings>) {
    setSettings((current) => ({ ...current, ...changes }));
    setSaved(false);
  }

  /** Toggling the last one off would leave a step nobody can complete. */
  function toggle<T extends string>(list: readonly T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((entry) => entry !== value)
      : [...list, value];
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { issues?: string[] };
        setError(body.issues?.join(" ") ?? "Could not save.");
        return;
      }
      const data = (await response.json()) as { settings: CustomTourSettings };
      setSettings(data.settings);
      setSaved(true);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-charcoal/45">Loading…</p>;
  }

  const noInterests = settings.interests.length === 0;
  const noAccommodation = settings.accommodation.length === 0;

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">Wizard settings</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
        What the custom-tour wizard offers a traveller. Changes take effect on
        the next page load; nothing here is retrospective, so enquiries already
        sent keep whatever they were sent with.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">Group size</h3>
        <label className="mt-3 flex items-center gap-3 text-sm text-charcoal">
          Largest group the wizard will accept
          <input
            type="number"
            min={1}
            max={TRAVELLER_CEILING}
            value={settings.maxTravellers}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isInteger(parsed) && parsed >= 1 && parsed <= TRAVELLER_CEILING) {
                patch({ maxTravellers: parsed });
              }
            }}
            className="min-h-10 w-24 rounded-full border border-stone-dark bg-warm-white px-4 text-sm text-charcoal"
          />
        </label>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-charcoal/45">
          Anything above {TRAVELLER_CEILING} is refused by the server whatever
          this says. The enquiry endpoint is open to the public, so its limit
          cannot depend on a setting that a caller might be able to influence.
        </p>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">Interests offered</h3>
        <p className="mt-1.5 text-sm text-charcoal/55">
          Unticking one hides that step&rsquo;s option. It does not hide the
          itineraries in that category — those are hidden on the itinerary
          itself.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ITINERARY_CATEGORIES.map(({ id, label }) => (
            <Toggle
              key={id}
              label={label}
              on={settings.interests.includes(id)}
              onClick={() =>
                patch({ interests: toggle<ItineraryCategory>(settings.interests, id) })
              }
            />
          ))}
        </div>
        {noInterests && (
          <p role="alert" className="mt-2 text-xs text-clay">
            At least one is needed — a step with nothing in it cannot be
            completed.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">Accommodation offered</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACCOMMODATION_KEYS.map((key) => (
            <Toggle
              key={key}
              label={ACCOMMODATION_LABELS[key]}
              on={settings.accommodation.includes(key)}
              onClick={() =>
                patch({
                  accommodation: toggle<AccommodationKey>(settings.accommodation, key),
                })
              }
            />
          ))}
        </div>
        {noAccommodation && (
          <p role="alert" className="mt-2 text-xs text-clay">
            At least one is needed.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">Closing notice</h3>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
          The paragraph printed at the end of the PDF and the Word file. Leave
          it empty to use the translated wording from the content files — which
          is usually right, because anything typed here is in one language and
          the document follows the traveller&rsquo;s.
        </p>
        <textarea
          value={settings.documentNotice}
          onChange={(event) => patch({ documentNotice: event.target.value })}
          rows={4}
          maxLength={2000}
          placeholder="Leave empty to use the translated wording."
          className="mt-3 w-full rounded-2xl border border-stone-dark bg-warm-white px-4 py-3 text-sm leading-relaxed text-charcoal placeholder:text-charcoal/35"
        />
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || noInterests || noAccommodation}
          className="min-h-11 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-charcoal/55">Saved.</span>}
        {settings.updatedBy && (
          <span className="text-xs text-charcoal/40">
            last changed by {settings.updatedBy}
            {settings.updatedAt ? ` on ${settings.updatedAt.slice(0, 10)}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={
        on
          ? "min-h-10 rounded-full bg-forest px-5 text-sm text-warm-white"
          : "min-h-10 rounded-full border border-stone-dark px-5 text-sm text-charcoal/60 transition-colors hover:border-forest hover:text-forest"
      }
    >
      {label}
    </button>
  );
}
