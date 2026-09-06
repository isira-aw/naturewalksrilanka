"use client";

import { useEffect, useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
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
  | { type: "GO_BACK" };

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
      return { ...state, travelers: Math.max(1, action.value) };
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
  aiAssistantEnabled = false,
}: {
  locale: string;
  whatsappNumber: string;
  aiAssistantEnabled?: boolean;
}) {
  const t = useTranslations("customTour");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the enter-transition flag when the step changes is the point of the effect
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [state.step]);

  const stepKeys = buildStepKeys(aiAssistantEnabled);
  const stepLabels = stepKeys.map((key) => t(`steps.${key}`));
  const totalSteps = stepKeys.length;
  const currentStepKey = stepKeys[state.step - 1];

  function validateCurrentStep(): string | null {
    switch (currentStepKey) {
      case "travelers":
        if (state.travelers < 1) return t("travelersLabel");
        return null;
      case "dates":
        if (!isValidRange(state.dateRange)) return t("datesInvalid");
        return null;
      case "interests":
        if (state.interests.length === 0) return t("interestsLabel");
        return null;
      case "accommodation":
      case "aiAssistant":
        return null;
      case "contact":
        if (!state.name.trim() || !isValidEmail(state.email) || !state.phone.trim()) {
          return t("contactName") + " / " + t("contactEmail") + " / " + t("contactPhone");
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

  return (
    <div>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 font-utility text-xs uppercase tracking-wide text-charcoal/50">
        {stepKeys.map((key, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === state.step;
          const isComplete = stepNumber < state.step;
          return (
            <li key={key} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true" className="text-charcoal/20">—</span>}
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5",
                  isCurrent && "text-forest",
                  isComplete && "text-charcoal/70"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                    isCurrent && "bg-forest text-warm-white",
                    !isCurrent && "border border-current/40"
                  )}
                >
                  {String(stepNumber).padStart(2, "0")}
                </span>
                <span className="hidden sm:inline">{stepLabels[index]}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" role="status">
        Step {state.step} of {totalSteps}: {stepLabels[state.step - 1]}
      </p>

      <div
        key={state.step}
        className={cn(
          "mt-10 transition-all duration-200 ease-out",
          currentStepKey !== "aiAssistant" && "max-w-3xl",
          visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        )}
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
      </div>

      {error && (
        <p role="alert" className="mt-6 max-w-3xl text-sm text-clay">
          {error}
        </p>
      )}

      <div className="mt-10 flex max-w-3xl items-center justify-between border-t border-charcoal/10 pt-8">
        <Button
          type="button"
          variant="secondary"
          onClick={handleBack}
          disabled={state.step === 1}
        >
          {t("back")}
        </Button>
        {state.step < totalSteps && (
          <Button type="button" variant="primary" onClick={handleNext}>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
