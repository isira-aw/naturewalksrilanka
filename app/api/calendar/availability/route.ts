import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAvailability } from "@/lib/calendar/googleCalendar";

const requestSchema = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "unknown", error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: "unknown", error: "invalid_range" }, { status: 400 });
  }

  const { startDate, endDate } = parsed.data;
  if (new Date(startDate) >= new Date(endDate)) {
    return NextResponse.json({ status: "unknown", error: "invalid_range" }, { status: 400 });
  }

  const result = await checkAvailability(startDate, endDate);

  return NextResponse.json({
    status: result.status,
    ...(result.status === "unavailable" ? { unavailableRanges: result.busyRanges } : {}),
  });
}
