# Go-live checklist

What has to happen before and around launch, in the order it has to happen.
Everything here needs either credentials, a person, or a business fact — none
of it can be done from a code session, which is exactly why it is written
down rather than done.

The architecture itself is settled: Next.js on Vercel, Firestore for data,
Firebase Auth for sign-in, Cloudinary for every photograph. A deployment with
no Firebase variables still builds and serves every public page; the
Firebase-backed features report themselves unavailable rather than failing.

---

## 1. Before the first deploy

- [ ] **`firebase deploy --only firestore:indexes`.** Three composites matter:
      `tourRequests` on `status` + `createdAt`, `tourRequests` on `email` +
      `createdAt`, and the reviews one. Without them the Customers status
      filter and the traveller's own trip list **fail outright** — not
      degrade, fail.
- [ ] **Set `SUPER_ADMIN_EMAIL`**, comma-separated, more than one address.
      Until it is set nobody can edit the access list. The panel says so
      rather than failing silently, but it is still a lockout.
- [ ] **Set the Vercel project's Node version to 22.** The `engines` field
      does not rebuild a deployment that is already out there, and Node 20
      returns 500 on *every* page — see `FIREBASE_INTEGRATION.md` §0.
- [ ] **Delete `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`
      from Vercel.** The shared-password login they belonged to is gone and
      nothing reads them. A live secret nobody uses is a secret nobody
      rotates.
- [ ] **Set `TRAVELLER_LINK_SECRET`** — 32 characters or more, random.
      `openssl rand -base64 36` gives 48. It signs the cookie that opens one
      trip by reference. Without it that way in is simply not offered: the
      page falls back to the emailed link and says nothing is broken, because
      an unsigned cookie would be a way in for anybody. Short values are
      treated as unset for the same reason — and silently, so if the button
      does not appear after setting this, check the length first.
      **Generate it where it will live**, not in a chat window or a ticket,
      and note that rotating it invalidates every cookie already issued:
      travellers simply unlock again, but do not rotate it expecting nothing
      to happen. Vercel injects variables at build time, so an existing
      deployment needs a redeploy to see it.
- [ ] Optionally set `GOOGLE_AI_MODEL`. The default is `gemini-3.6-flash`.

`scripts/grant-admin.mjs` bootstraps a deployment with no super admin
configured, and doubles as the credential test: it uses the same service
account and touches both Auth and Firestore.

## 2. Prove it against the real project

Everything touching Firestore or Firebase Auth has been compiled and
typechecked but **never run against the real project** — every session that
built it had no credentials. In priority order:

- [ ] **Open a real enquiry in Customers and press *Download PDF*.** This is
      the feature the admin round was built for and the one most worth seeing
      work end to end.
- [ ] **Test `discardProbeAccount` deliberately**, with a throwaway Google
      account: confirm the sign-in is refused **and** that the account is
      gone afterwards. This is the one piece where a bug deletes something
      real, so test it on purpose rather than discovering it.
- [ ] **Send two or three enquiries in a row** and confirm each lands in
      Customers. The enquiry rate limiter writes to Firestore and has only
      ever run against a stub. Eight per hour is far above anything a person
      does, so a real traveller should never meet it — but nobody has watched
      it work.
- [ ] **Walk all three ways into `/my-trip`.** The emailed link (open it on a
      *different* device too — that path exists now and had been a dead end);
      a password account, which needs its one confirmation email before it can
      open anything; and opening a single trip by reference and address, which
      needs `TRAVELLER_LINK_SECRET` set. Check that the reference route shows
      the trip read-only and offers nothing at `/my-trip` itself.
- [ ] **Press *Test the connection* in the AI section.** `gemini-3.6-flash`
      has never run against a real key.
- [ ] Confirm the snapshot write: an enquiry that records no
      `documentSnapshot` still works and still warns, but every rebuild then
      falls back to today's itineraries, which is not the intent.

## 3. Promote the Content Security Policy

The policy is live but sent **report-only** — it reports what it would refuse
and refuses nothing — because the flows most likely to trip it need the real
Firebase project. Everything reachable without credentials was already walked
with it enforcing and came back clean.

Do this while doing §2, with devtools open; it costs nothing extra.

- [ ] Sign in to the admin panel, upload a photograph to an itinerary, and
      follow a traveller email link through to `/my-trip`.
- [ ] Collect the violation reports and add any missing host to the right
      directive in `next.config.ts`, with a comment saying what needs it.
- [ ] Rename the header to `Content-Security-Policy`.

`security-headers.md` has the full procedure, what is already proved, and the
one report that is expected and harmless.

## 4. Content only the business can supply

- [ ] **The two FAQ answers** — "what is included in the price" and "how and
      when do I pay". They carry `contentRequired: true` in
      `content/<locale>/faq.json` and do not render until answered.
- [ ] **The four open privacy questions**, listed on the privacy page itself:
      who is formally responsible and where to write, how long each thing is
      kept, the legal basis, and how an EU or UK visitor exercises their
      rights. The rest of that page is accurate and checked against the code;
      these need Nandana and a lawyer. Until they are answered the page
      promises that a request made via the Contact page will be honoured —
      somebody has to actually honour it.
- [ ] **A localized privacy policy.** The page is English-only and says so.
- [ ] **Search Console and Bing verification codes** — `seo.md` has the
      step-by-step.
- [ ] **Native-speaker review** of the Dutch, Spanish, Danish and Finnish
      copy, including the `search`, `faq`, `newsletter` and `gallery`
      strings. The `gallery` ones are the newest and least reviewed.
- [ ] **Final photography** — several images are still reused from the old
      site or are generic placeholders. `photography.md` lists which, and
      where each came from.

## 5. Standing decisions

Recorded so they are not re-proposed as if they were oversights.

| | |
|---|---|
| **Analytics** | None, deliberately. Search Console gives search traffic; on-site behaviour is what is given up. The site therefore sets **no cookie at all** until somebody signs in, so there is no consent banner to build. A cookieless provider later (Plausible, Vercel Analytics) keeps it that way; GA4 would bring a banner, pre-consent suppression and a cookie section with it. |
| **The remaining `npm audit` findings** | Leave them. 1 high (`js-yaml`, build-time only) and 6 moderate, all transitive through `firebase-admin`'s storage chain. `firebase-admin` is what pins Node 22 and the `jose` override, and both have taken the site down before: the fix currently carries more risk than the bugs. |
| **Data export/import** | There is none, on purpose. Backups are Firestore's own. |
| **Dark mode** | Declined. |
| **Cookie banner and UTM tracking** | Both assume analytics that is not installed. The only cookies are strictly-necessary session ones, which are consent-exempt, so a banner would be theatre. |
| **`FAQPage` JSON-LD** | Google restricted that rich result to government and health sites. Emitting it from a tour operator gains nothing and invites review. |
| **Enquiry documents are kept as a JSON snapshot** | Taken in the traveller's browser as they send, so the team can reopen exactly what the traveller got. The alternatives were rebuilding live (drifts when an itinerary is edited) and storing the rendered PDF (byte-perfect, but the file is produced in an unauthenticated visitor's browser, so keeping it means accepting their upload). `lib/journey-document/fromRequest.ts` carries the detail. |
| **No search across enquiries** | The Customers filter works over the pages already loaded. Searching the whole collection is not something Firestore can do without a separate search index, which is not worth adding at this size. |
| **No server-side renderer for the journey document** | Which is what emailing one would need. The browser-side rebuild reuses the renderer the traveller's own copy came from, and so cannot drift from it. Out of scope unless emailing documents becomes a requirement. |
| **Admin access is revoked immediately, not cached** | Verifying the session cookie costs a round trip to Google per request, and a one-minute cache was proposed to remove it. Declined: it would delay revoking somebody's access by up to that minute. `lib/admin/auth.ts` says so where the decision bites. |
| **Three ways into a saved trip, and they grant different things** | The emailed link and a password both *prove the address is yours*, so they open every trip filed under it and allow editing. Opening one trip by its reference plus that address proves less — a reference is five readable characters and a neighbouring code is guessable — so it grants less: that **one** reference, read-only, and `/my-trip` ignores its cookie entirely. That asymmetry is the feature, not an oversight. Widening it so a reference unlock lists an address's other trips, or lets contact details be edited, turns one guessed code into somebody's whole record. `lib/tourRequests/referenceAccess.ts` carries the reasoning. |
| **A password account still needs one confirmation email** | `createTravellerSession` refuses any token whose address is unverified. That check is what stops somebody registering with another person's address and reading their enquiries, so it cannot be relaxed to spare the email. After that one confirmation the password is enough forever, which is the actual gain. |
| **Three third-party services at runtime** | Cloudinary serves every photograph; `tile.openstreetmap.org` and `router.project-osrm.org` serve the journey map, in the wizard *and* inside the PDF and Word documents. The two map services are free, best-effort and rate-limited by policy rather than contract. Both degrade to a straight line rather than failing. A busy site should move to a keyed tile provider. None of the three is exercised by `next build`. |
