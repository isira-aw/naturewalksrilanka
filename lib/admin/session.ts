import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * The admin sign-in.
 *
 * Credentials are only ever compared on the server and the cookie is
 * httpOnly, so neither the address nor the password is ever part of the
 * client bundle, rendered into the page, or readable from JavaScript in the
 * browser. The sign-in form posts to `/api/admin/session`, which is the only
 * place either value exists.
 *
 * `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` must all be set in
 * the environment. There are deliberately no fallbacks: a default password
 * committed to the repository is a password everyone with the repository
 * knows, and a default signing secret is worse still — the session token's
 * only payload is a timestamp, so anyone holding the secret can mint a valid
 * cookie without ever seeing the password. If a value is missing, sign-in
 * fails closed rather than quietly accepting a known-public credential.
 */

export const ADMIN_COOKIE_NAME = "nwsl_admin";
/** Long enough for an afternoon of editing, short enough to matter. */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

/** The three values sign-in needs, or `null` when the environment is incomplete. */
function credentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!email || !password || !secret) return null;
  return { email, password, secret };
}

/** Names the missing variables once, so a locked-out operator knows why. */
function warnUnconfigured() {
  const missing = (["ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET"] as const).filter(
    (name) => !process.env[name],
  );
  console.error(
    `Admin sign-in is disabled: ${missing.join(", ")} not set in the environment.`,
  );
}

/** Constant-time compare that does not leak which of the two inputs is longer. */
function equals(a: string, b: string, secret: string) {
  const left = Buffer.from(createHmac("sha256", secret).update(a).digest("hex"));
  const right = Buffer.from(createHmac("sha256", secret).update(b).digest("hex"));
  return timingSafeEqual(left, right);
}

export function checkCredentials(email: string, password: string) {
  const expected = credentials();
  if (!expected) {
    warnUnconfigured();
    return false;
  }
  // Both comparisons always run, so a wrong address and a wrong password take
  // the same time to reject.
  const emailOk = equals(
    email.trim().toLowerCase(),
    expected.email.trim().toLowerCase(),
    expected.secret,
  );
  const passwordOk = equals(password, expected.password, expected.secret);
  return emailOk && passwordOk;
}

/** `<issuedAt>.<signature>` — self-contained, so no session table is needed. */
export function issueSession() {
  const configured = credentials();
  if (!configured) throw new Error("ADMIN_SESSION_SECRET is not set.");
  const issuedAt = Date.now().toString(36);
  return `${issuedAt}.${createHmac("sha256", configured.secret).update(issuedAt).digest("hex")}`;
}

export function isValidSession(value: string | undefined): boolean {
  if (!value) return false;
  const configured = credentials();
  if (!configured) return false;
  const [issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature) return false;

  const expected = createHmac("sha256", configured.secret).update(issuedAt).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, signatureBuf)) return false;

  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued)) return false;
  return Date.now() - issued < ADMIN_SESSION_MAX_AGE * 1000;
}

/*
 * There is deliberately no `requireAdmin` here any more.
 *
 * Authorisation now lives in `lib/admin/auth.ts`, where it is asynchronous
 * because verifying a Firebase session cookie is a real operation. A sync
 * `requireAdmin` sitting in this file would be an easy wrong import, and the
 * failure mode is silent: `if (!requireAdmin(req))` against an async function
 * tests a Promise, which is always truthy, and waves everyone through.
 */
