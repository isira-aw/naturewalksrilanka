# Handoff

Branch: `claude/festive-archimedes-4pr0wk`. `main` is at `ce3f220` — rounds
**#37** and **#38**, merged 2026-09-19. Round **#39** is this branch and is
not merged yet.

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
| Traveller auth | **One way in** — Google sign-in, the same door the team uses. A traveller sees every enquiry under their address, read-only, with a comment thread and a delete button |
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
| `lib/tourRequests/travellerSession.ts` | The one traveller door, and why the other three are gone |
| `lib/tourRequests/comments.ts` | The thread on an enquiry. What replaced editing |
| `components/comments/CommentThread.tsx` | One thread component, both panels. Shares the store, deliberately not the authorisation |
| `app/api/traveller/requests/[reference]/route.ts` | The traveller deleting their own enquiry — the only destructive action either side has |
| `lib/tourRequests/rateLimit.ts` | How often one caller may write an enquiry. Fixed hash buckets, no addresses stored, **fails open on purpose** |
| `docs/go-live.md` | **The launch checklist.** Start here |
| `docs/gotchas.md` | Twelve faults already paid for once; §11 and §12 are new |
| `docs/security-headers.md` | The four headers, and the four steps that turn the CSP on |

Load-bearing from before, unchanged: `lib/admin/auth.ts` (the only
authorisation point), `lib/firebase/admin.ts` (the only door to Firestore),
`firestore.rules` (denies all client access on purpose), and
`package.json` → `overrides` (removing it takes the site down on Node 20).

---

## Changes made

Only the unmerged round belongs here; everything before it is in `main`'s
history, where each commit message carries its own reasoning.

**#39** — the traveller's three ways in (emailed link, password account, and
one trip unlocked by reference plus address) replaced by Google sign-in, the
same mechanism the team uses. Editing an enquiry went with them, and the
`revisions` subcollection it needed; a `comments` thread either side can
write on took its place, and the traveller can now delete an enquiry
outright. The privacy page and five locale files were corrected to match.

---

## Failed attempts

`docs/gotchas.md` has the twelve standing ones, numbered, and **§11 and §12
are new** — the throwing `adminDb()`, and a deleted feature leaving prose
behind that nothing typechecks. Read those two before touching Firebase
initialisation or removing anything user-facing.

One thing from #39 that is a design lesson rather than a fault, and lives in
`docs/go-live.md`'s decisions table rather than here: **three small doors
cost more than one large one.** The emailed link, the password account and
the reference unlock were each defensible alone; together they were the
largest thing in the codebase, and they granted three *different* amounts of
access to the same page. *Count the doors, not the features.*

---

## Next steps

**`docs/go-live.md` is the list.** It is ordered, and everything on it needs
credentials, a person, or a business fact. The short version:

1. **Before the first deploy** — deploy the Firestore indexes (two features
   fail outright without them), set `SUPER_ADMIN_EMAIL`, pin Node 22, and
   delete the four dead secrets from Vercel (`TRAVELLER_LINK_SECRET` is now
   one of them).
2. **Prove it against the real project** — §2. Traveller sign-in, the comment
   thread and the delete have never made a real Firestore or Auth call; the
   delete is a `recursiveDelete`, so it is the one that can destroy something
   real if it is wrong.
3. **Promote the CSP** — §3. Do it while doing §2, with devtools open. Both
   populations now sign in through the same Google pop-up, so one pass proves
   both.
4. **Content only Nandana can supply** — §4. Two FAQ answers, the four
   privacy questions, verification codes, native-speaker review.

Nothing else is waiting on code.
