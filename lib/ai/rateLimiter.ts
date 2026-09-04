import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const DEVICE_COOKIE_NAME = "ai_device_id";
const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000;

const counters = new Map<string, { count: number; resetAt: number }>();

function secret() {
  return process.env.AI_ASSISTANT_SECRET ?? "naturewalksrilanka-ai-assistant-fallback-secret";
}

function sign(id: string) {
  return createHmac("sha256", secret()).update(id).digest("hex");
}

function isValidSignedId(value: string): string | null {
  const [id, signature] = value.split(".");
  if (!id || !signature) return null;
  const expected = sign(id);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return null;
  return timingSafeEqual(expectedBuf, signatureBuf) ? id : null;
}

/**
 * Reads a signed device-id cookie value; returns a verified device id and,
 * if the cookie was missing/invalid, a new signed cookie value to set on
 * the response so the same device is recognized next time.
 */
export function resolveDeviceId(cookieValue: string | undefined) {
  const existing = cookieValue ? isValidSignedId(cookieValue) : null;
  if (existing) {
    return { deviceId: existing, cookieToSet: null as string | null };
  }
  const id = randomBytes(16).toString("hex");
  return { deviceId: id, cookieToSet: `${id}.${sign(id)}` };
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export function checkAndConsume(deviceId: string): RateLimitResult {
  const now = Date.now();
  const entry = counters.get(deviceId);

  if (!entry || entry.resetAt <= now) {
    counters.set(deviceId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true };
}
