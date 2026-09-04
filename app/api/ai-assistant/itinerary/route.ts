import { NextResponse } from "next/server";
import { isAiAssistantEnabled } from "@/lib/ai/config";
import { itineraryRequestSchema } from "@/lib/ai/itinerarySchema";
import { generateItinerary } from "@/lib/ai/geminiClient";
import { DEVICE_COOKIE_NAME, checkAndConsume, resolveDeviceId } from "@/lib/ai/rateLimiter";

export async function POST(request: Request) {
  if (!isAiAssistantEnabled()) {
    return NextResponse.json({ error: "not_enabled" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = itineraryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (new Date(parsed.data.startDate) >= new Date(parsed.data.endDate)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const existingCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${DEVICE_COOKIE_NAME}=`))
    ?.slice(DEVICE_COOKIE_NAME.length + 1);

  const { deviceId, cookieToSet } = resolveDeviceId(existingCookie);
  const rateLimit = checkAndConsume(deviceId);

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: "rate_limited", retryAfterMs: rateLimit.retryAfterMs },
      { status: 429 }
    );
    if (cookieToSet) setDeviceCookie(response, cookieToSet);
    return response;
  }

  const itinerary = await generateItinerary(parsed.data);

  if (!itinerary) {
    const response = NextResponse.json({ error: "generation_failed" }, { status: 502 });
    if (cookieToSet) setDeviceCookie(response, cookieToSet);
    return response;
  }

  const response = NextResponse.json({ itinerary });
  if (cookieToSet) setDeviceCookie(response, cookieToSet);
  return response;
}

function setDeviceCookie(response: NextResponse, value: string) {
  response.cookies.set(DEVICE_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}
