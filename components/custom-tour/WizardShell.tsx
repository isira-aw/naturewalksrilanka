"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { Experience } from "@/lib/content/schema";
import { StepProgressBar, StepProgressRail } from "./StepProgress";
import { isValidRange, type DateRangeValue } from "@/lib/tour/dateRange";
import type { ItineraryPlan } from "@/lib/ai/itinerarySchema";
import { TravelersStep } from "./steps/TravelersStep";
import { DatesStep } from "./steps/DatesStep";
import { InterestsStep } from "./steps/InterestsStep";
import { AccommodationStep } from "./steps/AccommodationStep";
import { AIAssistantStep, type AiAssistantStatus } from "./steps/AIAssistantStep";
import { ContactStep } from "./steps/ContactStep";
import { ReviewStep } from "./steps/ReviewStep";

export type WizardState = {
  step: number;
  travelers: number;
  dateRange: DateRangeValue;
  interests: string[];
  accommodation: string[];
  accommodationNotes: string;
  aiItinerary: ItineraryPlan | null;
  aiSelections: string[];
  aiStatus: AiAssistantStatus;
  name: string;
  email: string;
  phone: string;
  country: string;
  requirements: string;
};

type WizardAction =
  | { type: "SET_TRAVELERS"; value: number }
  | { type: "SET_DATE_RANGE"; value: DateRangeValue }
  | { type: "TOGGLE_INTEREST"; value: string }
  | { type: "TOGGLE_ACCOMMODATION"; value: string }
  | { type: "SET_ACCOMMODATION_NOTES"; value: string }
  | { type: "SET_AI_STATUS"; value: AiAssistantStatus }
  | { type: "SET_AI_ITINERARY"; value: ItineraryPlan | null }
  | { type: "SELECT_AI_DAY_OPTION"; dayIndex: number; slug: string }
  | { type: "BACK_AI_DAY_OPTION" }
  | { type: "SET_FIELD"; field: "name" | "email" | "phone" | "country" | "requirements"; value: string }
  | { type: "GO_NEXT"; totalSteps: number }
  | { type: "GO_BACK" }
  | { type: "GO_TO"; step: number };

const BASE_STEP_KEYS = ["travelers", "dates", "interests", "accommodation", "contact", "review"] as const;

function buildStepKeys(aiAssistantEnabled: boolean) {
  if (!aiAssistantEnabled) return [...BASE_STEP_KEYS];
  const accommodationIndex = BASE_STEP_KEYS.indexOf("accommodation");
  return [
    ...BASE_STEP_KEYS.slice(0, accommodationIndex + 1),
    "aiAssistant",
    ...BASE_STEP_KEYS.slice(accommodationIndex + 1),
  ];
}

/** The party sizes the company takes: a solo traveller up to a group of twelve. */
export const MIN_TRAVELERS = 1;
export const MAX_TRAVELERS = 12;

const initialState: WizardState = {
  step: 1,
  travelers: 2,
  dateRange: { start: null, end: null },
  interests: [],
  accommodation: [],
  accommodationNotes: "",
  aiItinerary: null,
  aiSelections: [],
  aiStatus: "idle",
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
    case "TOGGLE_INTEREST":
      return { ...state, interests: toggleValue(state.interests, action.value) };
    case "TOGGLE_ACCOMMODATION":
      return { ...state, accommodation: toggleValue(state.accommodation, action.value) };
    case "SET_ACCOMMODATION_NOTES":
      return { ...state, accommodationNotes: action.value };
    case "SET_AI_STATUS":
      return { ...state, aiStatus: action.value };
    case "SET_AI_ITINERARY":
      return { ...state, aiItinerary: action.value, aiSelections: [] };
    case "SELECT_AI_DAY_OPTION": {
      const next = state.aiSelections.slice(0, action.dayIndex);
      next[action.dayIndex] = action.slug;
      return { ...state, aiSelections: next };
    }
    case "BACK_AI_DAY_OPTION":
      return { ...state, aiSelections: state.aiSelections.slice(0, -1) };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "GO_NEXT":
      return { ...state, step: Math.min(action.totalSteps, state.step + 1) };
    case "GO_BACK":
      return { ...state, step: Math.max(1, state.step - 1) };
    case "GO_TO":
      return { ...state, step: action.step };
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
  experiences,
  aiAssistantEnabled = false,
}: {
  locale: string;
  whatsappNumber: string;
  experiences: Experience[];
  aiAssistantEnabled?: boolean;
}) {
  const t = useTranslations("customTour");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    /* A step change swaps the whole panel; on a phone the new step would
       otherwise open scrolled past its own heading. */
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.step]);

  const stepKeys = buildStepKeys(aiAssistantEnabled);
  const stepLabels = stepKeys.map((key) => t(`steps.${key}`));
  const totalSteps = stepKeys.length;
  const currentStepKey = stepKeys[state.step - 1];
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
      case "aiAssistant":
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

  return (
    <div ref={topRef} className="scroll-mt-24 lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-14">
      <div className="lg:sticky lg:top-28 lg:self-start">
        {/* Desktop: the whole path stays visible, so nobody wonders how much is left. */}
        <div className="hidden lg:block">
          <StepProgressRail steps={stepLabels} current={state.step} onGoTo={handleGoTo} />
        </div>
        {/* Mobile: one line and a bar — seven steps side by side never fit. */}
        <div className="lg:hidden">
          <StepProgressBar
            steps={stepLabels}
            current={state.step}
            stepOfLabel={t("stepOf", { current: state.step, total: totalSteps })}
          />
        </div>
      </div>

      <div className="mt-8 pb-2 lg:mt-0 lg:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(!["aiAssistant", "interests"].includes(currentStepKey) && "max-w-3xl")}
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
                onToggle={(value) => dispatch({ type: "TOGGLE_INTEREST", value })}
                experiences={experiences}
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
            {currentStepKey === "aiAssistant" && (
              <AIAssistantStep
                travelers={state.travelers}
                dateRange={state.dateRange}
                interests={state.interests}
                accommodation={state.accommodation}
                accommodationNotes={state.accommodationNotes}
                itinerary={state.aiItinerary}
                selections={state.aiSelections}
                status={state.aiStatus}
                onStatusChange={(value) => dispatch({ type: "SET_AI_STATUS", value })}
                onItinerary={(value) => dispatch({ type: "SET_AI_ITINERARY", value })}
                onSelectDay={(dayIndex, slug) => dispatch({ type: "SELECT_AI_DAY_OPTION", dayIndex, slug })}
                onBackDay={() => dispatch({ type: "BACK_AI_DAY_OPTION" })}
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
              <ReviewStep state={state} locale={locale} whatsappNumber={whatsappNumber} />
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p
            role="alert"
            className="mt-6 flex max-w-3xl items-start gap-2 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal"
          >
            <span aria-hidden="true" className="mt-0.5 text-clay">
              !
            </span>
            {error}
          </p>
        )}

        {/* Desktop keeps the controls in the flow of the form... */}
        <div className="mt-10 hidden max-w-3xl items-center justify-between border-t border-charcoal/10 pt-8 sm:flex">
          <Button type="button" variant="secondary" onClick={handleBack} disabled={state.step === 1}>
            {t("back")}
          </Button>
          {!isLastStep && (
            <Button type="button" variant="primary" onClick={handleNext}>
              {t("next")}
            </Button>
          )}
        </div>
      </div>

      {/* ...while on a phone they dock to the bottom of the screen, so Continue
          is reachable without scrolling past a long list of options. */}
      <div className="sticky bottom-0 z-30 -mx-6 mt-8 flex items-center gap-3 border-t border-stone-dark bg-warm-white/95 px-6 py-3 backdrop-blur sm:hidden">
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
