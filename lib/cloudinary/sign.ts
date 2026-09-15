import "server-only";
import { createHash } from "node:crypto";
import { requireCloudinary } from "./config";

/**
 * Signing, which is the whole of Cloudinary's authentication.
 *
 * A signed request proves the caller holds the API secret. The recipe is
 * Cloudinary's: take every parameter that will be sent except `file`,
 * `api_key` and `resource_type`, sort by key, join as a query string, append
 * the secret, and SHA-1 the result.
 *
 * The ordering matters and is easy to get subtly wrong by hand, which is why
 * every signed call in this project goes through `signedParams` rather than
 * assembling its own form data. A signature over a different set of
 * parameters than the ones actually sent fails with a 401 that says nothing
 * useful about which parameter drifted.
 */

/** Seconds, not milliseconds — Cloudinary rejects a timestamp in the wrong unit. */
export function cloudinaryTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Signs `params` and returns everything the request body needs, the
 * signature and `api_key` included.
 *
 * Values are stringified here so the caller cannot sign a number and send a
 * string, which produces the same unhelpful 401.
 */
export function signedParams(params: Record<string, string | number>): Record<string, string> {
  const { apiKey, apiSecret } = requireCloudinary();

  const toSign = Object.entries(params)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  const signature = createHash("sha1")
    .update(toSign.map(([key, value]) => `${key}=${value}`).join("&") + apiSecret)
    .digest("hex");

  return {
    ...Object.fromEntries(toSign),
    api_key: apiKey,
    signature,
  };
}
