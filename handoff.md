# Handoff — itineraries, take-away documents, bigger idea dialog

## Goal

Four changes to `/[locale]/custom-tour`, on top of the earlier layout work:

1. "Journey ideas" is called **Itineraries** everywhere.
2. The Review step offers a **Download as PDF**, and the WhatsApp hand-off also
   saves a **Word (.doc) copy** of the same journey so it can be attached to the chat.
3. Both documents carry every selected itinerary in full, with the itinerary's
   own photographs used as page and section backgrounds.
4. The itinerary dialog is much larger (a near-full-height sheet on a phone), and
   "What you might see" renders photograph cards rather than a text list.

## Current state

Done, committed on `claude/journey-itineraries-pdf-whatsapp-0k2gck` and open for
review as [PR #8](https://github.com/isira-aw/naturewalksrilanka/pull/8).
`tsc --noEmit`, `eslint` and `next build` are clean.

Walked end to end against `next start` on :3000 with Playwright at 1440x900 and
390x844: no horizontal overflow at either size, the dialog measures 1152x810 on
the laptop and 390x793 on the phone, and both files download from the Review
step. The generated PDF was re-parsed and rendered page by page — 5 pages, 4
image XObjects (cover, page background, section band, gallery photo: no
duplicates), page 1 mean brightness 49/255, so the dimmed cover really is dimmed.
The Word file was opened as HTML in Chromium and lays out as intended.

**Judging brightness from a screenshot in this harness is unreliable** — rendered
PNGs of the dark cover page came back looking undimmed. Measure pixel means (see
`Failed attempts`) rather than trusting the eye.

## Active files

| File | Role |
| --- | --- |
| `content/<locale>/ui.json` | Renamed strings + new `downloadPdf`, `downloadPreparing`, `downloadError`, `submitHint` and the `document.*` group |
| `content/en/experiences.json` | Each highlight now names its photograph; the other locales are regenerated from it |
| `components/custom-tour/steps/ReviewStep.tsx` | Builds the `JourneyDocument`, PDF button, WhatsApp + Word hand-off |
| `components/custom-tour/ExperienceDialog.tsx` | The larger dialog and the highlight photo cards |
| `lib/journey-document/model.ts` | The shape both documents render |
| `lib/journey-document/assets.ts` | Image loading, cropping, dimming, download |
| `lib/journey-document/pdf.ts` | The PDF (jsPDF, dynamically imported) |
| `lib/journey-document/word.ts` | The Word file (Word-flavoured HTML) |
| `lib/journey-document/index.ts` | `downloadJourneyDocument(doc, "pdf" \| "doc")` |
| `lib/content/loader.ts`, `lib/content/images.ts` | Drops highlight photographs that have not been supplied yet |
| `lib/whatsapp/buildMessage.ts` | `journeyIdeas` renamed to `itineraries` |
| `public/images/highlights/README.md` | What to drop in, file by file |

## Changes made

**Copy.** `suggestionsTitle`, `suggestionsSelectedLabel`, `suggestionsEmpty` and
`interestsHint` renamed in all five locales (en Itineraries, da Rejseplaner,
es Itinerarios, fi Matkaohjelmat, nl Reisroutes) — the Danish, Spanish, Finnish
and Dutch wordings are machine-chosen and want a native check. The WhatsApp
message now says "Itineraries I'd like to include:".

**Documents.** `ReviewStep` assembles one `JourneyDocument` — labels, summary
rows, contact rows, the full text of each selected itinerary, the AI route and a
cover photograph — and the PDF and the Word file are two renderings of it, so
the download and the copy attached to the chat can never disagree. Photographs
are re-encoded through a canvas at 1400px/q78, cropped centrally to the box they
fill, and **dimmed in the canvas** rather than under a translucent overlay:
Word cannot dim a cell background at all, and a PDF transparency group is the
kind of thing a phone viewer flattens. The PDF gives each itinerary its own page
with a full-bleed photo band carrying the title, and every content page sits on a
90%-washed copy of the relevant photograph. The Word file is Word-flavoured HTML
with base64 JPEGs, using single-cell tables (the one construction Word paints a
background picture into) with a solid colour and a real `<img>` gallery as
fallbacks.

**Dialog.** `h-[94dvh]` sheet on a phone, `lg:max-w-5xl xl:max-w-6xl` on a
laptop; photographs in the left column, facts, description and the "What you
might see" cards in the right, so the highlights are visible without scrolling.

**Highlight photographs.** Every highlight in `content/en/experiences.json` now
names `/images/highlights/<experience-slug>/<species>.jpg`, the loader drops the
ones whose file does not exist yet (same arrangement as the destination photos),
and `public/images/highlights/README.md` lists all 41 files to supply. Until they
land, each card shows a lettered tile and the documents print the highlight
without a thumbnail.

**Dependency.** `jspdf` (^4.2.1), imported dynamically so only a traveller who
asks for a PDF downloads it.

## Failed attempts

- **Real species photographs could not be fetched.** `upload.wikimedia.org` is
  refused by this session's egress proxy (403 on CONNECT), so no photograph of a
  Blue Magpie or a leopard could be added. The drop-in convention above is the
  substitute; a photograph of the wrong bird under an endemic's name would be
  worse than none.
- **Reading brightness off a screenshot.** Rendered pages of the dimmed cover
  looked undimmed in this harness three times running. Extracting the embedded
  JPEG and computing a pixel mean (49/255) settled it, and a pure-Python PNG mean
  over the rendered page agreed. Trust numbers here, not the picture.
- **jsPDF image aliasing.** With no `alias` argument jsPDF keys an image on the
  head of its data, so the dark cover and the washed page background — two crops
  of the same photograph — are one entry and the last one drawn wins for both.
  Every `addImage` now passes a role-and-source alias (`cover:`, `page:`,
  `band:`, `thumb:`, `gallery:<src>:<w>x<h>`), which keeps genuinely repeated
  images de-duplicated.
- **A gallery photo alone on its own page.** The gallery used to be drawn after
  the highlights and kept spilling onto an otherwise empty page; it now sits
  directly under the description.
- **`pkill -f "next start"` kills the shell running it** in this environment, so
  the rebuilt server never restarted and the browser kept loading chunk files the
  new build had deleted (500s, a page that never hydrated, a Continue button that
  did nothing). Kill `next-server`, in its own command, and check the page 200s
  before testing.
- **Driving the wizard headlessly.** As noted in the previous handoff,
  framer-motion's exit animation never finishes while the page is not painting,
  so the next step never mounts. Take a screenshot between clicks to force paints
  and poll for an element of the next step. `pdfjs-dist` 5.x also needs a newer
  Chromium than the bundled one — 4.10.38 renders fine.

## Next steps

1. **Native review of the four renamed strings** (see Copy above).
2. **The 41 highlight photographs** — `public/images/highlights/README.md`.
3. **Open the .doc in real Word.** It was verified as HTML in a browser; Word's
   own handling of a data-URI cell background is the one thing that could not be
   tested here. The fallbacks mean it degrades to a solid colour band, never to
   unreadable text.
4. **Non-Latin text in the PDF.** jsPDF's built-in fonts are WinAnsi, so anything
   outside Latin-1 (a name pasted in Sinhala, say) is stripped by `safe()`. If
   that matters, embed a Unicode font.
5. Delete this file before merge if the team does not keep handoff notes in-tree.
