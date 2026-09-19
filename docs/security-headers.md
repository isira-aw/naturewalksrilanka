# Security headers

Every response carries four headers, set in one place — the `headers()` block
in `next.config.ts`. Three are enforcing and settled. The fourth, the Content
Security Policy, is deliberately still in report-only mode and is the only one
with anything left to do.

## The three that are settled

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | The host redirects http to https, but the redirect itself is one plaintext round trip. HSTS removes it. `preload` is deliberately left off: it is a one-way door that takes months to undo and commits every future subdomain with it. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | An admin URL or a one-time review link must not be handed to a third-party host in full. The origin is all any of them needs. |
| `X-Content-Type-Options` | `nosniff` | A browser must not guess that something we serve as text is really a script. |

`X-Frame-Options` is **not** set, and does not need to be: the CSP's
`frame-ancestors 'none'` is the modern form of it and every browser this site
supports honours it.

## The Content Security Policy

Sent as `Content-Security-Policy-Report-Only`. The browser reports what the
policy *would* have refused and refuses nothing.

That is not caution for its own sake. A CSP breaks a page by making a request
quietly disappear, and the two flows most likely to trip this one — the admin
Google sign-in popup and the traveller's email sign-in link — cannot be
exercised without the real Firebase project. Report-only means the policy can
be proved against the live site before it can cost anybody a sign-in.

### What is already proved

Walked with the policy **enforcing**, against a production build:

- Every public page, in more than one locale, and both 404 pages — clean.
- The custom-tour wizard, end to end to the review step, including the journey
  map — clean.
- The PDF: built, and handed over as a download, under enforcement.
- Form validation still refuses a missing required field (see the Zod note
  below, which is the reason to check).

### What is not

Anything that needs Firebase credentials, which is why the header is still
report-only:

- Admin Google sign-in — the popup, and the auth handler it returns through on
  `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`. This is what `frame-src` is for, and the
  first place to look if sign-in shows up in the reports.
- The traveller's Google sign-in, and `/my-trip`. Same pop-up as the admin
  one above, so the two stand or fall together.
- The admin itinerary editor's Cloudinary upload (`connect-src`).

### One report is expected

Zod probes for `Function("")` once, to decide whether it may compile its
validators, and that probe is a `script-src eval` report from the custom-tour
page. Zod wraps the probe in a `try`/`catch` precisely so a CSP may refuse it;
when refused it validates the slower way instead, which was confirmed under
enforcement — an empty required field is still rejected. Ignore it, or set
`z.config({ jitless: true })` to stop the probe being made at all.

### Turning it on

1. Deploy as it is and use the site normally for a few days — in particular,
   sign in to the admin panel, upload a photograph to an itinerary, and sign
   in to `/my-trip` as a traveller.
2. Collect the reports. There is no reporting endpoint, so they appear in the
   browser console; the person doing step 1 should have devtools open, or add
   a `report-to` endpoint first.
3. Add any host that shows up to the right directive in `next.config.ts`, with
   a comment saying what needs it. If a host surprises you, find out why it is
   being contacted before allowing it — that is the policy doing its job.
4. When a full pass produces nothing but the Zod line, rename the header from
   `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

### About `script-src 'unsafe-inline'`

Worth being plain about: with `'unsafe-inline'` this policy does not stop
injected inline script. The alternative is a per-request nonce, and a nonce has
to be generated per request, which makes every page dynamic — this site is
almost entirely prerendered, and that is a poor trade against an injection
route the site does not have, since nothing here renders user-supplied HTML.

What the policy does buy is everything else: script cannot be *loaded* from a
host not named in it, the site cannot be framed, forms cannot post anywhere but
back to it, `object-src 'none'` closes the plugin surface, `base-uri 'self'`
stops a rewritten base tag redirecting every relative URL, and `connect-src`
bounds where data can be sent.

If the site ever renders HTML somebody else wrote, revisit this and pay for the
nonce.
