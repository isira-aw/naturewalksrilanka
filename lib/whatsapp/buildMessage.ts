export type CustomTourWhatsAppInput = {
  travelers: number;
  startDate: string | null;
  endDate: string | null;
  interests: string[];
  accommodation: string[];
  accommodationNotes: string;
  /** Prebuilt journey ideas the traveller ticked, as "Title — Location". */
  journeyIdeas: string[];
  aiRoute: string[];
  name: string;
  email: string;
  phone: string;
  country: string;
  requirements: string;
};

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function buildCustomTourMessage(input: CustomTourWhatsAppInput, locale: string) {
  const lines: string[] = [];
  lines.push("Hello Nandana,");
  lines.push("");
  lines.push("I would like to plan a custom Sri Lanka tour.");
  lines.push("");

  if (input.startDate && input.endDate) {
    lines.push("Travel dates:");
    lines.push(`${formatDate(input.startDate, locale)} – ${formatDate(input.endDate, locale)}`);
    lines.push("");
  }

  lines.push("Travelers:");
  lines.push(String(input.travelers));
  lines.push("");

  if (input.interests.length) {
    lines.push("Interests:");
    lines.push(input.interests.join(", "));
    lines.push("");
  }

  if (input.accommodation.length) {
    lines.push("Accommodation:");
    lines.push(input.accommodation.join(", "));
    lines.push("");
  }

  if (input.accommodationNotes.trim()) {
    lines.push("Accommodation notes:");
    lines.push(input.accommodationNotes.trim());
    lines.push("");
  }

  if (input.journeyIdeas.length) {
    lines.push("Journey ideas I'd like to include:");
    input.journeyIdeas.forEach((idea) => lines.push(`- ${idea}`));
    lines.push("");
  }

  if (input.aiRoute.length) {
    lines.push("AI-suggested route:");
    input.aiRoute.forEach((place, index) => lines.push(`Day ${index + 1}: ${place}`));
    lines.push("");
  }

  lines.push("Name:");
  lines.push(input.name || "-");
  lines.push("");
  lines.push("Email:");
  lines.push(input.email || "-");
  lines.push("");
  lines.push("WhatsApp / Phone:");
  lines.push(input.phone || "-");
  lines.push("");
  if (input.country.trim()) {
    lines.push("Country:");
    lines.push(input.country.trim());
    lines.push("");
  }

  if (input.requirements.trim()) {
    lines.push("Additional requirements:");
    lines.push(input.requirements.trim());
    lines.push("");
  }

  lines.push("I would like to discuss the itinerary with you.");

  return lines.join("\n");
}

export function buildTourInquiryMessage(tourTitle: string) {
  return [
    "Hello Nandana,",
    "",
    `I'm interested in the ${tourTitle} tour and would like to discuss it with you.`,
  ].join("\n");
}

export function buildGeneralMessage() {
  return "Hello Nandana, I'd like to ask about planning a Sri Lanka tour.";
}

export function buildWhatsAppUrl(phoneDigitsOnly: string, message: string) {
  const sanitizedPhone = phoneDigitsOnly.replace(/[^0-9]/g, "");
  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
}
