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
 * The defaults below are what the operator was given. Set `ADMIN_EMAIL`,
 * `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in the deployment environment to
 * override them — and do change the password there, because a default that
 * lives in the repository is a default everyone with the repository knows.
 */
const DEFAULT_EMAIL = "naturewalksrilanka@gmail.com";
const DEFAULT_PASSWORD = "000000";

export const ADMIN_COOKIE_NAME = "nwsl_admin";
/** Long enough for an afternoon of editing, short enough to matter. */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? "naturewalksrilanka-admin-fallback-secret";
}

/** Constant-time compare that does not leak which of the two inputs is longer. */
function equals(a: string, b: string) {
  const left = Buffer.from(createHmac("sha256", secret()).update(a).digest("hex"));
  const right = Buffer.from(createHmac("sha256", secret()).update(b).digest("hex"));
  return timingSafeEqual(left, right);
}

export function checkCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  // Both comparisons always run, so a wrong address and a wrong password take
  // the same time to reject.
  const emailOk = equals(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase());
  const passwordOk = equals(password, expectedPassword);
  return emailOk && passwordOk;
}

/** `<issuedAt>.<signature>` — self-contained, so no session table is needed. */
export function issueSession() {
  const issuedAt = Date.now().toString(36);
  return `${issuedAt}.${createHmac("sha256", secret()).update(issuedAt).digest("hex")}`;
}

export function isValidSession(value: string | undefined): boolean {
  if (!value) return false;
  const [issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature) return false;

  const expected = createHmac("sha256", secret()).update(issuedAt).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, signatureBuf)) return false;

  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued)) return false;
  return Date.now() - issued < ADMIN_SESSION_MAX_AGE * 1000;
}

/** Reads the session cookie straight off a request. */
export function sessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.slice(ADMIN_COOKIE_NAME.length + 1);
}

export function requireAdmin(request: Request) {
  return isValidSession(sessionFromRequest(request));
}
