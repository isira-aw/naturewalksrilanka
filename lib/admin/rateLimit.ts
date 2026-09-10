import "server-only";

/**
 * A small brake on admin sign-in attempts.
 *
 * Counters live in this process's memory, which is the honest limitation:
 * they reset on every deploy and are not shared between serverless instances,
 * so a determined attacker spread across instances gets more attempts than the
 * number below suggests. That is still worth having — it turns an unlimited
 * online password guessing attack into a slow one, and it costs nothing. When
 * the admin panel moves to Firebase Auth this file goes away, because
 * Firebase applies its own throttling.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Bucket = { count: number; expiresAt: number };

const buckets = new Map<string, Bucket>();

/** Drops expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
}

/**
 * The caller's address. `x-forwarded-for` is set by the hosting proxy and can
 * be spoofed when the app is exposed directly, so this is a speed bump rather
 * than an identity.
 */
export function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Records an attempt. Returns false once the caller is over the limit. */
export function allowAttempt(key: string) {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= MAX_ATTEMPTS;
}

/** Clears the counter after a successful sign-in. */
export function resetAttempts(key: string) {
  buckets.delete(key);
}

/** Seconds until the caller may try again — for the `Retry-After` header. */
export function retryAfterSeconds(key: string) {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  return Math.max(1, Math.ceil((bucket.expiresAt - Date.now()) / 1000));
}
