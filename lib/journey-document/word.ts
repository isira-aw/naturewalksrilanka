"use client";

import { cropToAspect, tinted, toDataUrl, type LoadedImage } from "./assets";
import type { JourneyDocument, JourneyItinerary, JourneyRow } from "./model";

/**
 * The same journey as a Word file.
 *
 * Word opens HTML saved with a `.doc` extension and keeps the layout, which is
 * the only way to produce an editable document in the browser without shipping
 * a document library. Photographs are embedded as base64 JPEGs — once in each
 * section's cell background, so the text sits on the picture, and again as
 * ordinary images for the gallery.
 */

const FOREST = "#1F3D2A";
const CHARCOAL = "#262624";
const MUTED = "#7A7A74";
const RULE = "#DEDAD1";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PAGE_BREAK =
  '<br clear="all" style="mso-special-character:line-break;page-break-before:always" />';

export function buildJourneyDoc(doc: JourneyDocument, images: Map<string, LoadedImage>): Blob {
  /** A photograph cropped, dimmed and encoded for use behind text. */
  function backdrop(src: string | undefined, aspect: number, color: string, alpha: number) {
    const image = src ? images.get(src) : undefined;
    if (!image) return null;
    return toDataUrl(tinted(cropToAspect(image, aspect), color, alpha));
  }

  function picture(src: string | undefined, aspect: number) {
    const image = src ? images.get(src) : undefined;
    return image ? toDataUrl(cropToAspect(image, aspect)) : null;
  }

  /* A single-cell table is the one construction Word reliably paints a
     background picture into, so every banded block is built this way. */
  function band(background: string | null, fallback: string, height: number, inner: string) {
    const backgroundAttrs = background
      ? ` background="${background}" style="background:${fallback};background-image:url('${background}');background-repeat:no-repeat;background-size:cover;"`
      : ` style="background:${fallback};"`;
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18pt 0;">
      <tr><td height="${height}"${backgroundAttrs}><div style="padding:22pt 20pt;">${inner}</div></td></tr>
    </table>`;
  }

  function rowsTable(entries: JourneyRow[]) {
    const body = entries
      .map(
        (entry) => `<tr>
          <td width="30%" style="padding:6pt 10pt 6pt 0;border-bottom:1px solid ${RULE};color:${MUTED};font-size:9pt;">${escapeHtml(
            entry.label
          )}</td>
          <td style="padding:6pt 0;border-bottom:1px solid ${RULE};color:${CHARCOAL};font-size:10pt;">${escapeHtml(
            entry.value || "-"
          ).replace(/\n/g, "<br />")}</td>
        </tr>`
      )
      .join("");
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16pt;">${body}</table>`;
  }

  function sectionTitle(text: string) {
    return `<p style="font-size:14pt;font-weight:bold;color:${FOREST};border-bottom:1px solid ${RULE};padding-bottom:5pt;margin:0 0 12pt 0;">${escapeHtml(
      text
    )}</p>`;
  }

  function highlightsTable(itinerary: JourneyItinerary) {
    const rows = itinerary.highlights
      .map((highlight) => {
        const thumb = picture(highlight.image, 1);
        const image = thumb
          ? `<img src="${thumb}" width="58" height="58" alt="" style="display:block;" />`
          : `<div style="width:58px;height:58px;background:${RULE};"></div>`;
        return `<tr>
          <td width="70" style="padding:6pt 10pt 6pt 0;border-bottom:1px solid ${RULE};">${image}</td>
          <td style="padding:6pt 0;border-bottom:1px solid ${RULE};">
            <span style="font-size:10pt;font-weight:bold;color:${CHARCOAL};">${escapeHtml(
              highlight.name
            )}</span>${
              highlight.note
                ? `<br /><span style="font-size:9pt;color:${MUTED};">${escapeHtml(highlight.note)}</span>`
                : ""
            }
          </td>
        </tr>`;
      })
      .join("");
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14pt;">${rows}</table>`;
  }

  function gallery(itinerary: JourneyItinerary) {
    const frames = itinerary.images
      .slice(1, 3)
      .map((src) => picture(src, 4 / 3))
      .filter((src): src is string => Boolean(src));
    if (!frames.length) return "";
    const cells = frames
      .map(
        (src) =>
          `<td width="${Math.floor(100 / frames.length)}%" style="padding:0 6pt 0 0;"><img src="${src}" width="${
            frames.length > 1 ? 250 : 420
          }" alt="" style="display:block;" /></td>`
      )
      .join("");
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14pt;"><tr>${cells}</tr></table>`;
  }

  function itinerarySection(itinerary: JourneyItinerary) {
    const heroSrc = itinerary.images[0] ?? doc.coverImage;
    const heading = band(
      backdrop(heroSrc, 210 / 62, "#000000", 0.45),
      FOREST,
      120,
      `<p style="margin:0;color:#FFFFFF;font-size:9pt;letter-spacing:1pt;">${escapeHtml(
        itinerary.location.toUpperCase()
      )}</p>
       <p style="margin:6pt 0 0 0;color:#FFFFFF;font-size:20pt;font-weight:bold;">${escapeHtml(
         itinerary.title
       )}</p>`
    );

    /* The body of the section sits on a washed-out copy of the same
       photograph — the picture is the page's background, not a sticker. */
    const body = band(
      backdrop(heroSrc, 210 / 200, "#FFFFFF", 0.88),
      "#FDFCF9",
      0,
      `<p style="margin:0 0 10pt 0;color:${MUTED};font-size:9pt;">${escapeHtml(
        doc.labels.bestTimeLabel
      )}: ${escapeHtml(itinerary.bestTime)} &nbsp;|&nbsp; ${escapeHtml(
        doc.labels.durationLabel
      )}: ${escapeHtml(itinerary.duration)}</p>
       <p style="margin:0 0 10pt 0;font-size:11pt;font-weight:bold;color:${CHARCOAL};">${escapeHtml(
         itinerary.summary
       )}</p>
       <p style="margin:0 0 14pt 0;font-size:10.5pt;line-height:150%;color:${CHARCOAL};">${escapeHtml(
         itinerary.description
       )}</p>
       ${itinerary.highlights.length ? sectionTitle(doc.labels.highlightsTitle) + highlightsTable(itinerary) : ""}
       ${gallery(itinerary)}`
    );

    return PAGE_BREAK + heading + body;
  }

  const cover = band(
    backdrop(doc.coverImage, 210 / 150, "#000000", 0.55),
    FOREST,
    300,
    `<p style="margin:0;color:#FFFFFF;font-size:9pt;letter-spacing:1.5pt;">${escapeHtml(
      doc.labels.tagline.toUpperCase()
    )}</p>
     <p style="margin:10pt 0 14pt 0;color:#FFFFFF;font-size:28pt;font-weight:bold;">${escapeHtml(
       doc.labels.title
     )}</p>
     ${
       doc.preparedFor.trim()
         ? `<p style="margin:0;color:#FFFFFF;font-size:11pt;">${escapeHtml(
             doc.labels.preparedFor
           )}: ${escapeHtml(doc.preparedFor)}</p>`
         : ""
     }
     <p style="margin:4pt 0 0 0;color:#FFFFFF;font-size:11pt;">${escapeHtml(
       doc.labels.preparedOn
     )}: ${escapeHtml(doc.preparedOn)}</p>`
  );

  const aiRoute = doc.aiRoute.length
    ? sectionTitle(doc.labels.aiRouteTitle) +
      `<p style="margin:0 0 16pt 0;font-size:10.5pt;line-height:160%;color:${CHARCOAL};">${doc.aiRoute
        .map((line) => escapeHtml(line))
        .join("<br />")}</p>`
    : "";

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.labels.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
@page WordSection1 { size: 595.3pt 841.9pt; margin: 48pt 48pt 48pt 48pt; }
div.WordSection1 { page: WordSection1; }
body { font-family: Calibri, "Segoe UI", sans-serif; color: ${CHARCOAL}; font-size: 10.5pt; }
p { margin: 0 0 8pt 0; }
</style>
</head>
<body>
<div class="WordSection1">
${cover}
${sectionTitle(doc.labels.summaryTitle)}
${rowsTable(doc.summaryRows)}
${aiRoute}
${doc.itineraries.length ? sectionTitle(doc.labels.itinerariesTitle) : ""}
${doc.itineraries.map(itinerarySection).join("")}
${PAGE_BREAK}
${sectionTitle(doc.labels.contactTitle)}
${rowsTable(doc.contactRows)}
<p style="margin-top:18pt;font-size:9pt;color:${MUTED};">${escapeHtml(doc.labels.footer)}</p>
</div>
</body>
</html>`;

  // The BOM is what makes Word read the file as UTF-8 rather than as ANSI.
  return new Blob(["﻿", html], { type: "application/msword" });
}
