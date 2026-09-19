# Handoff

Branch: `claude/funny-lovelace-6jpkhk`. Rounds **#37** and **#38** merged on
2026-09-19; `main` is at `ce3f220` plus whatever this branch adds.

> **This file is a pointer, not a record.** Two predecessors were deleted for
> growing into logs of already-merged work — one at 967 lines, one at 821 —
> with every live fact in them duplicated in `docs/`. The durable material
> lives in `docs/` and is listed below; this file says only where things
> stand *today* and what the next session should pick up. **If you find
> yourself pasting a completed round into it, put that in the commit message
> instead.** Delete this file again once *Next steps* is empty.

---

## Goal

Take a finished UI to a launchable production site:

1. **One architecture** — Next.js → Firebase (Auth, Firestore) → Vercel, with
   Cloudinary for photographs. One authentication method per population, one
   database, one file store. No offline, mock or password fallbacks.
2. **No dead weight** — one README plus `docs/`, no unused dependencies, no
   duplicated logic. *(Met: the repository is now exactly that.)*
3. **Launch readiness** — SEO, security headers, and the polish a visitor
   notices.
4. **Never guess** — no invented prices, policies, retention periods or
   business facts. Unknowns get a marked placeholder, not a plausible answer.

---

## Current state

**Green.** `tsc --noEmit`, `eslint` and `next build` pass on every commit.

| | |
|---|---|
| Next.js | 16.3.5 |
| Firebase | Connected, **Spark** plan. No Blaze, so no blocking functions — `docs/admin-access.md` |
| Admin auth | Google sign-in; the `staff` allowlist decides, the `admin` claim caches it, `SUPER_ADMIN_EMAIL` is the recovery path |
| Traveller auth | **Three ways in** — emailed link, password, or one trip by reference + address. They grant different things on purpose: `docs/go-live.md` §5 |
| Data | Firestore only. No export or import; backups are Firestore's own |
| Files | Cloudinary only |
| Security headers | HSTS, `Referrer-Policy`, `nosniff` enforcing. **CSP is report-only** and promoting it is a real task — `docs/security-headers.md` |
| Privacy page | Accurate about what the code stores. Four business questions still open on the page itself |

**The thing to keep in mind above all others:** nothing that touches Firestore
or Firebase Auth has ever been run against the real project. Every session
that built it worked without credentials. It is compiled, typechecked, and
in places proved against stubs — it is not proved against Firebase.
`docs/go-live.md` §2 is that list, in priority order.

---

## Active files

New this round, and worth reading before changing anything near them:

| File | What |
|---|---|
| `lib/tourRequests/rateLimit.ts` | How often one caller may write an enquiry, or attempt a trip unlock. Fixed hash buckets, no addresses stored, **fails open on purpose** |
| `lib/tourRequests/referenceAccess.ts` | The signed cookie that opens **one** trip. Why its scope is small is the point of the file |
| `app/api/traveller/unlock/route.ts` | Reference + address → that cookie. Counted before the lookup; one answer for every failure |
| `components/my-trip/TravellerPassword.tsx` | Sign in, register, reset. The confirmation email is not optional — the comment says why |
| `components/my-trip/TravellerAccess.tsx` | The emailed link, and the guard that stops it being spent twice |
| `docs/go-live.md` | **The launch checklist.** Start here |
| `docs/gotchas.md` | Ten faults already paid for once |
| `docs/security-headers.md` | The four headers, and the four steps that turn the CSP on |

Load-bearing from before, unchanged: `lib/admin/auth.ts` (the only
authorisation point), `lib/firebase/admin.ts` (the only door to Firestore),
`firestore.rules` (denies all client access on purpose), and
`package.json` → `overrides` (removing it takes the site down on Node 20).

---

## Changes made

**#37** — the itinerary editor's *Planning* section removed as unwanted;
enquiry endpoint given a honeypot and a rate limit; `sitemap.ts` stopped
claiming every URL had just changed; a Content Security Policy added
report-only; the privacy policy rewritten to stop saying things that were
false; analytics settled as *none*; `handoff.md` and `PLAN.md` folded into
`docs/` and deleted.

**#38** — the sign-in link that reported itself expired, fixed; opening one
trip by reference and address added; password accounts added; and a
malformed `FIREBASE_PRIVATE_KEY` no longer turns the enquiry endpoint into a
500.

Each commit message carries its own reasoning. Do not re-summarise them here.

---

## Failed attempts

`docs/gotchas.md` has the ten standing ones, numbered. Three from this round
are worth knowing before touching the same ground:

1. **A "flaky" sign-in link was our own bug, twice over.** The one-time code
   was spent by a second run of the effect, and the "retype your address"
   path the comment promised did not exist. Neither was visible to `tsc`,
   `eslint` or `next build`. *Rule: when a one-time credential reports itself
   already used, suspect the client before the provider.*
2. **Rendering the screens found a 500 that reading them did not.** With all
   three Firebase variables present but the private key malformed,
   `adminDb()` throws rather than returning null; the rate limiter called it
   outside its `try`, so an endpoint contracted never to break sending broke
   it. *Rule: `isFirebaseConfigured()` being true does not mean `adminDb()`
   will not throw.*
3. **A new environment variable was documented in `docs/` but not in
   `.env.example`.** The file somebody actually copies. Caught on a re-read,
   not by anything failing. *Rule: a new variable lands in both, or it is
   not really documented.*

---

## Next steps

**`docs/go-live.md` is the list.** It is ordered, and everything on it needs
credentials, a person, or a business fact. The short version:

1. **Before the first deploy** — deploy the Firestore indexes (two features
   fail outright without them), set `SUPER_ADMIN_EMAIL` and
   `TRAVELLER_LINK_SECRET`, pin Node 22, and delete the three dead admin
   secrets from Vercel.
2. **Prove it against the real project** — §2. The traveller sign-in paths
   and the enquiry rate limiter have never made a real Firestore call.
3. **Promote the CSP** — §3. Do it while doing §2, with devtools open.
4. **Content only Nandana can supply** — §4. Two FAQ answers, the four
   privacy questions, verification codes, native-speaker review.

Nothing else is waiting on code.
