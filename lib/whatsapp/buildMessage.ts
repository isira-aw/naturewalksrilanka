import { SITE_URL } from "@/lib/seo/site";

export type CustomTourWhatsAppInput = {
  travelers: number;
  startDate: string | null;
  endDate: string | null;
  interests: string[];
  accommodation: string[];
  accommodationNotes: string;
  /** Prebuilt itineraries the traveller ticked, as "Title — Location". */
  itineraries: string[];
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

  if (input.itineraries.length) {
    lines.push("Itineraries I'd like to include:");
    input.itineraries.forEach((itinerary) => lines.push(`- ${itinerary}`));
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

  /* The traveller's own way back.
   *
   * This message ends up in the traveller's sent items, in a thread they
   * return to — which makes it the one durable artefact they keep after
   * leaving the site, and so the best place to put the link. A button in
   * the header only helps somebody who has come back to the site already.
   *
   * No reference number, deliberately: it is minted server-side by
   * `POST /api/custom-tour/requests`, which is fired without being awaited
   * so that WhatsApp opens whether or not the copy is saved. Waiting for a
   * reference to put here would make the save block the send, which is the
   * one thing that write is designed never to do. The bare link is enough —
   * signing in lists every enquiry under the address anyway. */
  lines.push("");
  lines.push(`See this enquiry any time at ${SITE_URL}/${locale}/my-trip`);
  lines.push("(sign in with this email address)");

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
