import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { listRequestsForEmail } from "@/lib/tourRequests/store";
import { travellerFromRequest } from "@/lib/tourRequests/travellerSession";

export const dynamic = "force-dynamic";

/**
 * The enquiries belonging to whoever is signed in.
 *
 * The address comes from the session cookie and from nowhere else. There is
 * no email parameter to pass, and no reference either — so there is nothing a
 * caller can change to see somebody else's trip. That is the whole security
 * model of this endpoint, and it is why it takes no input at all.
 *
 * Trimmed to what the list shows. The full enquiry is one more request away,
 * and only for a reference this same address owns.
 */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const email = await travellerFromRequest(request);
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const requests = await listRequestsForEmail(email);

    return NextResponse.json({
      email,
      requests: requests.map((entry) => ({
        reference: entry.reference,
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        travelers: entry.payload.travelers,
        dateRange: entry.payload.dateRange,
        itineraries: entry.payload.selectedExperiences.length,
      })),
    });
  } catch (error) {
    console.error(`Could not list enquiries for ${email}:`, error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
