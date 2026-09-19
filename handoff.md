# Handoff

Branch: `claude/festive-archimedes-4pr0wk`. Everything through round **#40**
is merged to `main`; nothing is outstanding on the branch.

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
| Reaching `/my-trip` | Four ways: the header button, the footer link, the line in the traveller's own WhatsApp message, and the review step. The header button shows **My Tour** to everyone *except* a visitor signed in with no enquiries, who gets the wizard instead |
| Data | Firestore only. No export or import; backups are Firestore's own |
| Files | Cloudinary only |
| Security headers | HSTS, `Referrer-Policy`, `nosniff` enforcing. **CSP is report-only** and promoting it is a real task — `docs/security-headers.md` |
| Privacy page | Accurate about what the code stores. Four business questions still open on the page itself |

**The site is now live against the real Firebase project, and some of it is
proved.** That changes the standing warning every previous handoff carried.
What has actually been exercised, by a person, against real credentials:

- Admin Google sign-in and the panel.
- Traveller Google sign-in, and a traveller's own list of tours.
- The enquiry write, and the Firestore indexes (all three deployed).

What still has not: **the comment thread and the delete.** The delete is a
`recursiveDelete` and is the one traveller-facing action that destroys
something real, so it is the one to test deliberately rather than discover.
`docs/go-live.md` §2 is the list.

---

## Active files

New this round, and worth reading before changing anything near them:

| File | What |
|---|---|
| `lib/tourRequests/travellerSession.ts` | The one traveller door, and why the other three are gone |
| `lib/tourRequests/comments.ts` | The thread on an enquiry. What replaced editing |
| `components/comments/CommentThread.tsx` | One thread component, both panels. Shares the store, deliberately not the authorisation |
| `app/api/traveller/requests/[reference]/route.ts` | The traveller deleting their own enquiry — the only destructive action either side has |
| `lib/tourRequests/savedTour.ts` | Whether the header offers a tour or the wizard. Three states, not two, and anonymous visitors cost nothing |
| `lib/whatsapp/buildMessage.ts` | The enquiry message, and the `/my-trip` line in it. Why it carries no reference number |
| `lib/tourRequests/rateLimit.ts` | How often one caller may write an enquiry. Fixed hash buckets, no addresses stored, **fails open on purpose** |
| `docs/go-live.md` | **The launch checklist.** Start here |
| `docs/gotchas.md` | Fourteen faults already paid for once; §11–§14 are new |
| `docs/security-headers.md` | The four headers, and the four steps that turn the CSP on |

Load-bearing from before, unchanged: `lib/admin/auth.ts` (the only
authorisation point), `lib/firebase/admin.ts` (the only door to Firestore),
`firestore.rules` (denies all client access on purpose), and
`package.json` → `overrides` (removing it takes the site down on Node 20).

---

## Changes made

Only what is not yet in `main` belongs here, and right now nothing is. The
merged rounds live in `main`'s history, where each commit message carries its
own reasoning — **#39** replaced the three traveller doors with Google
sign-in and editing with a comment thread; **#40** stopped `/my-trip`
returning a blank 500, and gave the page the four ways in it now has.

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

**`docs/go-live.md` is the list.** What is left needs a person or a business
fact, not code.

1. **Finish proving it** — §2. The comment thread and the delete are the two
   paths nobody has run against the real project. Post a comment from each
   side and confirm each appears on the other; delete a tour and confirm its
   `comments` subcollection goes with it. That delete is a `recursiveDelete`,
   so it is worth doing on purpose rather than meeting by accident.
2. **Promote the CSP** — §3, with devtools open. Both populations sign in
   through the same Google pop-up now, so one pass proves both.
3. **Content only Nandana can supply** — §4. Two FAQ answers, the four
   privacy questions, verification codes, native-speaker review.
4. **Look at the header button on the live site.** Anonymous visitors now see
   **My Tour** rather than *Plan Your Journey*: a deliberate choice about who
   that one slot serves, made knowing the wizard keeps `Custom Tour` in the
   main nav beside it and the home page calls to action. It is the change
   most worth a second opinion once it is in front of real visitors. Showing
   both — the wizard as the button, the tour as a small icon — is a one-line
   change if it reads wrong.

Done since the last handoff, so **not** to be redone: all three Firestore
indexes are deployed, and the site is serving with admin and traveller
sign-in both working against the real project.

Not known either way from here, so check before assuming: whether
`SUPER_ADMIN_EMAIL` is set, whether Node is pinned to 22 on Vercel, and
whether the dead secrets have been deleted from it. `docs/go-live.md` §1
still lists them.

Nothing is waiting on code.
