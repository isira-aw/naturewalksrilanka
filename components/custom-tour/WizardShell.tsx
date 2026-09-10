"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { Experience } from "@/lib/content/schema";
import { StepProgressBar, StepProgressRail } from "./StepProgress";
import { isValidRange, type DateRangeValue } from "@/lib/tour/dateRange";
import { useItineraries } from "@/lib/itineraries/useItineraries";
import { visibleExperiences } from "@/lib/itineraries/toExperience";
import { buildJourneyPlan } from "@/lib/journey/plan";
import { TravelersStep } from "./steps/TravelersStep";
import { DatesStep } from "./steps/DatesStep";
import { InterestsStep } from "./steps/InterestsStep";
import { AccommodationStep } from "./steps/AccommodationStep";
import { JourneyPlanStep } from "./steps/JourneyPlanStep";
import { ContactStep } from "./steps/ContactStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useJourneyDocument } from "./useJourneyDocument";
import { ResumeDraftBanner } from "./ResumeDraftBanner";
import {
  clearDraft,
  isResumable,
  loadDraft,
  saveDraft,
  type DraftState,
} from "@/lib/custom-tour/draftStorage";

export type WizardState = {
  step: number;
  travelers: number;
  dateRange: DateRangeValue;
  interests: string[];
  /** Slugs of the prebuilt itineraries the traveller ticked. */
  selectedExperiences: string[];
  accommodation: string[];
  accommodationNotes: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  requirements: string;
};

type WizardAction =
  | { type: "SET_TRAVELERS"; value: number }
  | { type: "SET_DATE_RANGE"; value: DateRangeValue }
  | { type: "TOGGLE_INTEREST"; value: string; experiences: Experience[] }
  | { type: "TOGGLE_EXPERIENCE"; value: string }
  | { type: "TOGGLE_ACCOMMODATION"; value: string }
  | { type: "SET_ACCOMMODATION_NOTES"; value: string }
  | { type: "SET_FIELD"; field: "name" | "email" | "phone" | "country" | "requirements"; value: string }
  | { type: "GO_NEXT"; totalSteps: number }
  | { type: "GO_BACK" }
  | { type: "GO_TO"; step: number }
  | { type: "RESTORE"; value: WizardState };

/* The journey plan sits after accommodation and before contact: it is the last
   thing built out of the traveller's answers, and the first thing they can
   take away. */
const STEP_KEYS = [
  "travelers",
  "dates",
  "interests",
  "accommodation",
  "journeyPlan",
  "contact",
  "review",
] as const;

/** The party sizes the company takes: a solo traveller up to a group of twelve. */
export const MIN_TRAVELERS = 1;
export const MAX_TRAVELERS = 12;

const initialState: WizardState = {
  step: 1,
  travelers: 2,
  dateRange: { start: null, end: null },
  interests: [],
  selectedExperiences: [],
  accommodation: [],
  accommodationNotes: "",
  name: "",
  email: "",
  phone: "",
  country: "",
  requirements: "",
};

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_TRAVELERS":
      return {
        ...state,
        travelers: Math.min(MAX_TRAVELERS, Math.max(MIN_TRAVELERS, action.value)),
      };
    case "SET_DATE_RANGE":
      return { ...state, dateRange: action.value };
    case "TOGGLE_INTEREST": {
      const interests = toggleValue(state.interests, action.value);
      /* Dropping a category drops the ideas that belonged to it — otherwise a
         de-selected category's ideas would still ride along to WhatsApp. */
      const stillVisible = new Set(
        action.experiences
          .filter((experience) => interests.includes(experience.category))
          .map((experience) => experience.slug)
      );
      return {
        ...state,
        interests,
        selectedExperiences: state.selectedExperiences.filter((slug) => stillVisible.has(slug)),
      };
    }
    case "TOGGLE_EXPERIENCE":
      return {
        ...state,
        selectedExperiences: toggleValue(state.selectedExperiences, action.value),
      };
    case "TOGGLE_ACCOMMODATION":
      return { ...state, accommodation: toggleValue(state.accommodation, action.value) };
    case "SET_ACCOMMODATION_NOTES":
      return { ...state, accommodationNotes: action.value };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "GO_NEXT":
      return { ...state, step: Math.min(action.totalSteps, state.step + 1) };
    case "GO_BACK":
      return { ...state, step: Math.max(1, state.step - 1) };
    case "GO_TO":
      return { ...state, step: action.step };
    case "RESTORE":
      /* The saved step could outlive a change to the wizard, so it is clamped
         rather than trusted. */
      return {
        ...action.value,
        step: Math.min(Math.max(1, action.value.step), STEP_KEYS.length),
      };
    default:
      return state;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function WizardShell({
  locale,
  whatsappNumber,
  experiences: published,
}: {
  locale: string;
  whatsappNumber: string;
  /** Itineraries committed to `content/`; the admin page adds the rest. */
  experiences: Experience[];
}) {
  const t = useTranslations("customTour");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const { records } = useItineraries();

  /* A draft found on this device, waiting for the traveller to say whether it
     is theirs to continue. Nothing is written back until that is settled, so
     the first render cannot overwrite the very draft it is offering. */
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [restoreSettled, setRestoreSettled] = useState(false);
  const [sent, setSent] = useState(false);
  /** Set when this visit is editing an already-sent enquiry. */
  const [amending, setAmending] = useState<string | null>(null);
  const [amendFailed, setAmendFailed] = useState(false);

  /* Reading storage in an effect, not during render: this page is prerendered
     per locale, localStorage does not exist on the server, and a lazy
     `useState` initialiser would therefore see null on the server and a draft
     on the client — a hydration mismatch. Setting state once on mount from a
     browser-only source is the case the rule cannot tell apart from a
     cascading render. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    /* `?amend=NW-XXXXX` means the traveller came from their saved trip to
       change it. Their sent answers win over any half-finished draft on this
       device, so the draft question is skipped entirely.

       The reference is read from `window.location` rather than
       `useSearchParams`, which would force this prerendered page into a
       Suspense boundary for a query string only a minority of visitors have. */
    const amend = new URLSearchParams(window.location.search).get("amend");
    if (amend) {
      setAmending(amend);
      void (async () => {
        try {
          const response = await fetch(
            `/api/custom-tour/requests?reference=${encodeURIComponent(amend)}`,
            { credentials: "same-origin", cache: "no-store" },
          );
          if (response.ok) {
            const { payload } = await response.json();
            dispatch({ type: "RESTORE", value: { ...payload, step: 1 } });
          } else {
            /* Not signed in, or not theirs. Send them to prove it rather
               than silently starting a blank trip they think is an edit. */
            setAmendFailed(true);
          }
        } catch {
          setAmendFailed(true);
        } finally {
          setRestoreSettled(true);
        }
      })();
      return;
    }

    const saved = loadDraft();
    if (saved && isResumable(saved)) {
      setDraft(saved);
      return;
    }
    if (saved) clearDraft();
    setRestoreSettled(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    /* Amendments are not drafted locally: the authoritative copy is the
       saved enquiry, and leaving a local draft behind would later offer an
       edit of an old trip as if it were a new one. */
    if (!restoreSettled || sent || amending) return;
    /* Debounced, because every keystroke in the contact step is a state
       change and none of them is worth a separate write. */
    const timer = window.setTimeout(() => saveDraft(state), 500);
    return () => window.clearTimeout(timer);
  }, [state, restoreSettled, sent, amending]);

  function handleResumeDraft() {
    if (draft) dispatch({ type: "RESTORE", value: draft });
    setDraft(null);
    setRestoreSettled(true);
  }

  function handleDiscardDraft() {
    clearDraft();
    setDraft(null);
    setRestoreSettled(true);
  }

  /* Sent to WhatsApp: the draft has served its purpose, and leaving it behind
     would offer the finished enquiry back as unfinished work.

     The enquiry is also recorded server-side here, deliberately without
     awaiting it. WhatsApp is how this business receives enquiries and has
     been for years; blocking that on a Firestore write — or failing it —
     would trade a working process for a new one. If the write fails the
     traveller still reaches the team, and only the saved copy is lost. */
  function handleSent() {
    setSent(true);
    clearDraft();

    /* The step counter is UI state, not part of the enquiry. */
    const { step, ...payload } = state;
    void step;
    void fetch("/api/custom-tour/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ payload, locale, reference: amending ?? undefined }),
    }).catch(() => {
      /* Nothing to show: the traveller is already on their way to WhatsApp. */
    });
  }

  /* Two sources, one list: whatever is committed to the content files, plus
     whatever the admin page holds. A record's slug wins over a published one
     of the same slug, so editing an itinerary in the admin page overrides the
     committed copy rather than showing both. */
  const experiences = useMemo(() => {
    const fromAdmin = visibleExperiences(records, locale);
    const overridden = new Set(fromAdmin.map((experience) => experience.slug));
    return [...published.filter((e) => !overridden.has(e.slug)), ...fromAdmin];
  }, [published, records, locale]);

  const selected = useMemo(
    () => experiences.filter((experience) => state.selectedExperiences.includes(experience.slug)),
    [experiences, state.selectedExperiences]
  );

  const plan = useMemo(
    () => buildJourneyPlan(selected, state.dateRange),
    [selected, state.dateRange]
  );

  const { download, pending, failed, interestLabels, accommodationLabels, datesValue, chosenIdeas } =
    useJourneyDocument({ state, locale, plan, whatsappNumber });

  useEffect(() => {
    /* A step change swaps the whole panel; on a phone the new step would
       otherwise open scrolled past its own heading. */
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.step]);

  const stepLabels = STEP_KEYS.map((key) => t(`steps.${key}`));
  const totalSteps = STEP_KEYS.length;
  const currentStepKey = STEP_KEYS[state.step - 1];
  const isLastStep = state.step === totalSteps;

  function validateCurrentStep(): string | null {
    switch (currentStepKey) {
      case "travelers":
        if (state.travelers < MIN_TRAVELERS || state.travelers > MAX_TRAVELERS) {
          return t("errorTravelers");
        }
        return null;
      case "dates":
        if (!isValidRange(state.dateRange)) return t("datesInvalid");
        return null;
      case "interests":
        if (state.interests.length === 0) return t("errorInterests");
        return null;
      case "accommodation":
      case "journeyPlan":
        return null;
      case "contact":
        if (!state.name.trim() || !isValidEmail(state.email) || !state.phone.trim()) {
          return t("errorContact");
        }
        return null;
      default:
        return null;
    }
  }

  function handleNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    dispatch({ type: "GO_NEXT", totalSteps });
  }

  function handleBack() {
    setError(null);
    dispatch({ type: "GO_BACK" });
  }

  function handleGoTo(step: number) {
    if (step >= state.step) return;
    setError(null);
    dispatch({ type: "GO_TO", step });
  }

  const stepOfLabel = t("stepOf", { current: state.step, total: totalSteps });

  return (
    <div ref={topRef} className="scroll-mt-20 sm:scroll-mt-24">
      {amending && !amendFailed && (
        <p className="mb-6 rounded-2xl border border-stone-dark bg-stone/20 px-5 py-4 text-sm leading-relaxed text-charcoal">
          {t("amending", { reference: amending })}
        </p>
      )}

      {amendFailed && (
        <p
          role="alert"
          className="mb-6 rounded-2xl bg-clay/10 px-5 py-4 text-sm leading-relaxed text-charcoal"
        >
          {t("amendFailed")}
        </p>
      )}

      {draft && !amending && (
        <ResumeDraftBanner onResume={handleResumeDraft} onDiscard={handleDiscardDraft} />
      )}

      {/* Mobile and tablet: one line and a bar — seven steps side by side never
          fit — pinned under the site header so the position stays visible while
          a long list of options scrolls past. */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-stone-dark/70 bg-warm-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 lg:hidden">
        <StepProgressBar steps={stepLabels} current={state.step} stepOfLabel={stepOfLabel} />
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-14">
        {/* Desktop: the whole path stays visible, so nobody wonders how much is left. */}
        <div className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
          <StepProgressRail
            steps={stepLabels}
            current={state.step}
            onGoTo={handleGoTo}
            stepOfLabel={stepOfLabel}
          />
        </div>

        {/* The step itself sits on a card, so the form reads as one surface
            against the page and each step can spread across the full column. */}
        <div className="min-w-0 rounded-2xl border border-stone-dark bg-warm-white p-5 shadow-[0_1px_2px_rgba(28,30,27,0.04)] sm:p-7 lg:p-9">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state.step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0"
            >
              {currentStepKey === "travelers" && (
                <TravelersStep
                  value={state.travelers}
                  onChange={(value) => dispatch({ type: "SET_TRAVELERS", value })}
                />
              )}
              {currentStepKey === "dates" && (
                <DatesStep
                  locale={locale}
                  value={state.dateRange}
                  onChange={(value) => dispatch({ type: "SET_DATE_RANGE", value })}
                />
              )}
              {currentStepKey === "interests" && (
                <InterestsStep
                  value={state.interests}
                  onToggle={(value) => dispatch({ type: "TOGGLE_INTEREST", value, experiences })}
                  experiences={experiences}
                  selectedExperiences={state.selectedExperiences}
                  onToggleExperience={(value) => dispatch({ type: "TOGGLE_EXPERIENCE", value })}
                />
              )}
              {currentStepKey === "accommodation" && (
                <AccommodationStep
                  value={state.accommodation}
                  onToggle={(value) => dispatch({ type: "TOGGLE_ACCOMMODATION", value })}
                  notes={state.accommodationNotes}
                  onNotesChange={(value) => dispatch({ type: "SET_ACCOMMODATION_NOTES", value })}
                />
              )}
              {currentStepKey === "journeyPlan" && (
                <JourneyPlanStep
                  plan={plan}
                  onDownload={(kind) => void download(kind)}
                  pending={pending}
                  failed={failed}
                />
              )}
              {currentStepKey === "contact" && (
                <ContactStep
                  name={state.name}
                  email={state.email}
                  phone={state.phone}
                  country={state.country}
                  requirements={state.requirements}
                  onChange={(field, value) => dispatch({ type: "SET_FIELD", field, value })}
                />
              )}
              {currentStepKey === "review" && (
                <ReviewStep
                  state={state}
                  locale={locale}
                  whatsappNumber={whatsappNumber}
                  plan={plan}
                  interestLabels={interestLabels}
                  accommodationLabels={accommodationLabels}
                  datesValue={datesValue}
                  chosenIdeas={chosenIdeas}
                  onDownload={(kind) => void download(kind)}
                  onSent={handleSent}
                  pending={pending}
                  failed={failed}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p
              role="alert"
              className="mt-6 flex max-w-2xl items-start gap-2 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal"
            >
              <span aria-hidden="true" className="mt-0.5 text-clay">
                !
              </span>
              {error}
            </p>
          )}

          {/* Tablet and desktop keep the controls in the flow of the form, on
              the card's own footer line so they close off the step... */}
          <div className="mt-8 hidden items-center justify-between gap-4 border-t border-stone-dark pt-6 sm:flex lg:mt-10 lg:pt-8">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={state.step === 1}
            >
              {t("back")}
            </Button>
            {!isLastStep && (
              <Button type="button" variant="primary" onClick={handleNext}>
                {t("next")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ...while on a phone they dock to the bottom of the screen, so Continue
          is reachable without scrolling past a long list of options. On the
          last step nothing is docked: the send button is the only action that
          should hold the bottom of the screen. */}
      <div
        className={cn(
          "z-30 -mx-4 mt-6 flex items-center gap-3 border-t border-stone-dark bg-warm-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden",
          !isLastStep && "sticky bottom-0"
        )}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={handleBack}
          disabled={state.step === 1}
          className="flex-1"
        >
          {t("back")}
        </Button>
        {!isLastStep && (
          <Button type="button" variant="primary" onClick={handleNext} className="flex-1">
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
