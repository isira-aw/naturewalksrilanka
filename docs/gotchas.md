# Things that have already gone wrong here

Ten of them, each one paid for once. They are collected here rather than in a
handoff file because §10 is what happens when a rule lives somewhere nobody
re-reads: it is §6 happening a second time, to somebody who had already
written §6 down.

Several of these were clean under `tsc`, `eslint` **and** `next build`. That
is the pattern worth internalising: this project's worst faults have been
invisible to the toolchain and visible only in a browser, an HTTP status, or a
parsed file.

## 1. `loading.tsx` at the locale root turns every 404 into a soft 404

A `loading.tsx` wraps everything below it in a Suspense boundary. Once that
boundary starts streaming the HTTP status has already been sent, so a
`notFound()` thrown by a page underneath can no longer set 404.

`app/[locale]/loading.tsx` therefore made every mistyped tour and destination
slug return **200** with the generic site title, streaming the not-found UI in
afterwards. Search engines read that as a duplicate of the home page — it
silently undid the 404 work and the SEO work before it.

Caught only by checking status codes in a browser. The skeleton now lives at
`app/[locale]/custom-tour/`, which has no slug to get wrong.

**Rule:** never put `loading.tsx` above a page that can call `notFound()`.

## 2. `npm` silently strips the `jose` override from the lockfile

Both `npm uninstall` and `npm install next@…` removed the `overrides` block
from the **lockfile's** root entry, while leaving it in `package.json`.
Resolution stayed correct at the time, so nothing appeared broken — but a
later install could resolve `jose` 6, which is ESM-only, and `jwks-rsa` does
`require('jose')`. That is the exact fault that returned 500 on *every* page
of the deployed site under Node 20.

Restored by hand both times, never by regenerating the lockfile — a full
regeneration once bumped 83 unrelated packages.

**Rule:** after any `npm install` or `npm uninstall`, check that
`packages[""].overrides` is still in `package-lock.json`.

## 3. The search dialog was mounted twice

`SiteSearch` was placed in both the desktop and the mobile header groups. Only
one button is ever visible, so clicking looked fine — but each instance
registered its own global Cmd/Ctrl-K listener and rendered its own portal, so
the keyboard shortcut opened **two stacked `aria-modal` dialogs**. Now mounted
once, in the flex row, visible at every breakpoint.

## 4. A test reported the custom-tour wizard as broken when it was not

An early Playwright script used `.last()` to find the Continue button and hit
the hidden mobile sticky bar, so clicks did nothing and the wizard looked
stuck. It was the selector, not the wizard.

**Rule:** this site's duplicated responsive controls punish loose selectors.
Filter by visibility first. See §9, which is this again.

## 5. An XML comment may not contain two consecutive hyphens

Documenting `app/icon.svg` with a reference to a CSS custom property put a
literal double hyphen inside an SVG `<!-- -->` block, which is illegal XML.
An SVG served as `image/svg+xml` is parsed strictly, so the browser would have
refused to render the icon at all. `tsc`, `eslint` and `next build` were all
perfectly happy; it was caught by parsing the file.

**Rule:** after editing any `.svg`, parse it. One line does it:
`python3 -c "import xml.dom.minidom;xml.dom.minidom.parse('app/icon.svg')"`.

## 6. `pkill -f "next start"` does not stop the server

The process is called `next-server`, so that pattern matches the npm wrapper
and leaves the server running. A stale one then keeps answering on its port
from an **old build** — which looks exactly like a new route 404ing. Worse,
`pgrep -f next-server` matches the shell command that contains that string, so
it reports a phantom process and `pkill -9 -f` kills the shell.

**Rule:** find it by what is listening, not by its name. See §10 for the
command that works.

## 7. `grep -- "$pattern" . --exclude-dir=…` silently searches everything

`--` ends option parsing, so every `--exclude-dir` after it became a filename
instead of an exclusion. The result was a confident report of references that
were really matches inside `node_modules` and `.next`.

**Rule:** for "is it gone", use `git grep`, which only sees tracked files.

## 8. Firestore drops documents that lack the field you order by

The admin itinerary list is alphabetical rather than featured-first, and not
by preference. `orderBy("featured")` **excludes every document that has no
`featured`** — which is every itinerary written before the field existed. The
list would have silently lost most of its rows, and looked like a data-loss
bug rather than a query one.

`head` is on every record, so the list sorts by that and shows `Featured` as a
label. The wizard still offers them featured-first: that read is the whole
(small) collection, sorted in memory, where the rule does not apply.

**Rule:** before ordering by a field in Firestore, ask whether every document
has it. Optional fields and `orderBy` do not mix.

## 9. Playwright's `has-text` is a case-insensitive substring match

A script driving the custom-tour wizard used
`:has-text("Continue"), :has-text("Review")` to find the forward button. The
`"Review"` half matched the progress rail's disabled **"07 REVIEW"** step, so
the run timed out clicking a button that can never be enabled — and read
exactly like the wizard being broken.

This is §4 again in a new costume.

**Rule:** `getByRole("button", { name, exact: true })`, and filter by
visibility. On this site especially.

## 10. §6 bit again — and the way that actually works

Killing the dev server with a command whose own text contains `next-server`
kills the shell running it, because the pattern matches the shell's own
`cmdline`. That is §6, already written down, and it still happened.

What works is finding the process by what is **listening**:

```sh
port_hex=$(printf '%04X' 3000)
inode=$(awk -v p=":$port_hex" 'NR>1 && $2 ~ p"$" && $4=="0A" {print $10; exit}' /proc/net/tcp)
# then find the pid holding that socket inode in /proc/*/fd, skipping your own
for d in /proc/[0-9]*; do
  pid=${d#/proc/}; [ "$pid" = "$$" ] && continue
  ls -l "$d/fd" 2>/dev/null | grep -q "socket:\[$inode\]" && kill "$pid"
done
```

Confirm with a request afterwards before trusting any verification run.

**Rule:** never pattern-match a process by a string your own command contains.
