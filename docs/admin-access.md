# Admin access, and the junk accounts in Firebase

## The problem, precisely

The admin panel is not insecure. Getting in requires a Google sign-in, a
`staff` document in Firestore, and an `admin` custom claim. A stranger gets a
403 and learns nothing.

What was wrong is one step earlier, and it is not an access problem at all —
it is a **data** problem:

`components/admin/AdminSignIn.tsx` signs in with `signInWithPopup`. Firebase
creates the user account **the instant the Google consent completes**, before
the server has looked at anything. Only afterwards does
`/api/admin/session` check the allowlist and refuse.

So anybody who finds `/admin`, presses "Continue with Google" once, and is then
refused, is now a permanent row in the NatureWalks project's Authentication
list. The list fills up with people who were never let in.

## What now happens

### 1. The account is deleted in the same request that refuses it

`lib/admin/signInGuard.ts` → `discardProbeAccount`. It deletes only an account
it can show was created by the attempt being refused. Every condition has to
hold:

- not a super admin (checked first, and without touching Firestore, so it
  cannot depend on a read that might fail);
- exactly one sign-in provider, and it is `google.com`;
- created within the last five minutes;
- not on the `staff` list;
- no `tourRequests` enquiry from that address;
- not a `newsletterSubscribers` document.

Anything it cannot establish, it keeps, and logs why. An account wrongly kept
is untidy; an account wrongly deleted is somebody's access destroyed.

### 2. Refusals are visible and rate limited

Each refusal is written to `adminSignInAttempts`, keyed by address. That one
document is both the audit line the **Access** section shows and the counter
behind the limit: **five refusals in fifteen minutes** and the address is
turned away without being checked, answered with `429`.

Firestore-backed, not in-process. An in-memory limiter used to live in this
codebase and was removed precisely because it does not survive serverless
instances — every cold start begins at zero, so the limit it appears to
enforce is not one.

It **fails open**. A counter that cannot be read must not lock the real staff
out of their own panel, and Firebase throttles its own sign-ins underneath
this regardless.

### 3. Staff are managed from the panel, by a super admin

The **Access** section lists the allowlist and shows recent refusals. Every
admin can read it — knowing who has access, and who has been trying to get in,
is useful to anyone running the site. **Only a super admin can change it**,
because adding an admin is handing out the keys, and an admin who can add
admins can promote anyone.

Super admins come from `SUPER_ADMIN_EMAIL`, comma-separated. Kept in the
environment rather than in Firestore deliberately: a super admin recorded in
the database it administers can be edited by whatever can write to that
database, while one in the environment can only be changed by whoever can
deploy.

It is also **the recovery path**. A super admin is admitted without a `staff`
document, so an emptied or badly-written list no longer locks everybody out —
previously the only way back was a command line and a service-account key.
Their own row cannot be removed from the list either: their access does not
come from it, so removing it would only make the list disagree with reality.

Set more than one. With exactly one, losing that account means a redeploy.

`scripts/grant-admin.mjs` remains for bootstrapping a deployment that has no
super admin configured.

### 4. The accounts that already accumulated

```
node --env-file=.env scripts/prune-auth-users.mjs            # report only
node --env-file=.env scripts/prune-auth-users.mjs --delete   # then act
```

Reports by default. Read the list before passing `--delete`.

## How the allowlist and the claim relate

This changed, and it is worth being explicit because the code used to say
something different.

The `staff` document **is** the authorisation. The `admin` custom claim must
agree with it, and is brought into line when it does not.

Previously the two were described as independent factors: the list *and* the
claim, on the grounds that "a list entry is trivially added by anyone who
reaches Firestore". That does not survive inspection. `firestore.rules` denies
all client access, so a `staff` document can only be written by an
already-authenticated admin through `/api/admin/access`, or by someone holding
the service account key — and anyone holding that key can set custom claims
directly anyway. The claim was never a barrier to the threat it was described
as stopping.

What the claim is actually for is **speed**: it rides inside the session
cookie, so `requireAdmin` answers without a Firestore read on every request.
Treat it as a cache of the allowlist.

Two consequences:

- **Adding staff is one step.** Add the address; the claim is granted the
  first time they sign in. Their first sign-in costs one extra round trip,
  because the token they arrived with was minted before the claim existed — the
  server answers `409`, the browser fetches a fresh token and retries. Once,
  ever, per person.
- **Removing staff clears all three**: the document, the claim, and their
  refresh tokens. Dropping only the document would leave a live session working
  for up to eight hours.

## The fix this is standing in for

All of the above is cleanup **after** the account has been created. The
correct fix refuses the sign-in **before** one exists: a Firebase
Authentication **`beforeCreate` blocking function**.

```js
// Cloud Function, deployed separately. Requires Identity Platform.
const { beforeUserCreated, HttpsError } = require("firebase-functions/v2/identity");
const { getFirestore } = require("firebase-admin/firestore");

exports.staffOnly = beforeUserCreated(async (event) => {
  const email = event.data?.email?.trim().toLowerCase();
  if (!email) throw new HttpsError("permission-denied", "No address.");

  const staff = await getFirestore().collection("staff").doc(email).get();
  if (!staff.exists) {
    throw new HttpsError("permission-denied", "Not a staff account.");
  }
});
```

**This project is on the Spark (free) plan, so it cannot be deployed.**
Blocking functions need Identity Platform, which needs Blaze.

Note also that the site's own travellers sign in through Firebase (email-link,
`/my-trip`), so a blocking function scoped this narrowly would lock *them* out
too. Deploying it means either restricting it to the Google provider, or
allowing any address that already holds an enquiry — the same standing test
`discardProbeAccount` applies. Work that out before deploying it, not after.

Until then the cleanup above is the honest best available, and it leaves no
account behind in practice — only, briefly, during the request that refuses it.

## What was considered and rejected

- **Moving the panel to a secret address.** It is already `Disallow`ed in
  `app/robots.ts` and absent from every navigation. A harder-to-guess path
  stops crawlers, not people, and it would be one more thing to remember.
- **Disabling sign-up for the Google provider.** Firebase has no such setting:
  for a federated provider, signing in *is* signing up. That is the whole
  reason this page exists.
