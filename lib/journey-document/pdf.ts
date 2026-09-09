"use client";

import { cropToAspect, tinted, type LoadedImage } from "./assets";
import type { JourneyDocument, JourneyItinerary } from "./model";

/* A4, in millimetres. */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 20;

/* The site's palette, so the document and the website read as one brand. */
const FOREST: [number, number, number] = [31, 61, 42];
const CHARCOAL: [number, number, number] = [38, 38, 36];
const MUTED: [number, number, number] = [122, 122, 116];
const RULE: [number, number, number] = [222, 218, 209];
const PAPER: [number, number, number] = [253, 252, 249];

/**
 * jsPDF's built-in fonts are WinAnsi-encoded, so anything outside Latin-1
 * comes out as mojibake. The wizard's five locales fit; this only guards
 * against a stray character pasted into a free-text field.
 */
function safe(text: string) {
  return text
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/•/g, "-")
    .replace(/[^ -ÿ€–—…]/g, "");
}

export async function buildJourneyPdf(
  doc: JourneyDocument,
  images: Map<string, LoadedImage>
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });

  let cursor = 0;
  let pageBackground: string | undefined;
  /* jsPDF derives an image's cache key from the head of its data when no
     alias is given, and two crops of the same photograph — the dark cover and
     the washed-out page behind the text — share that head. Naming each
     derivation keeps them apart while still storing one copy of a picture that
     really is repeated, such as the background of four pages. */
  function place(
    canvas: HTMLCanvasElement,
    alias: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    pdf.addImage(canvas, "JPEG", x, y, w, h, alias);
  }

  const setColor = ([r, g, b]: [number, number, number]) => pdf.setTextColor(r, g, b);

  function framed(src: string | undefined, aspect: number) {
    const image = src ? images.get(src) : undefined;
    return image ? cropToAspect(image, aspect) : null;
  }

  /* Photographs that sit behind text are dimmed in a canvas rather than under
     a translucent rectangle: a PDF transparency group is the kind of thing a
     phone's built-in viewer flattens away, and the text has to stay readable
     wherever the traveller opens the file. */
  function washed(src: string | undefined, aspect: number, color: string, alpha: number) {
    const image = framed(src, aspect);
    return image ? tinted(image, color, alpha) : null;
  }

  /** The washed-out photograph behind a content page. */
  function paintBackground() {
    pdf.setFillColor(...PAPER);
    pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
    const background = washed(pageBackground, PAGE_W / PAGE_H, "#FDFCF9", 0.9);
    if (!background) return;
    place(background, `page:${pageBackground}`, 0, 0, PAGE_W, PAGE_H);
  }

  function newPage(background?: string) {
    if (background !== undefined) pageBackground = background;
    pdf.addPage();
    paintBackground();
    cursor = MARGIN + 4;
  }

  /** Starts a new page when the next block would not fit on this one. */
  function ensure(height: number) {
    if (cursor + height > BOTTOM) newPage();
  }

  function paragraph(
    text: string,
    {
      size = 10.5,
      color = CHARCOAL,
      gap = 4,
      lineHeight = 5,
      style = "normal",
    }: { size?: number; color?: [number, number, number]; gap?: number; lineHeight?: number; style?: "normal" | "bold" } = {}
  ) {
    if (!text.trim()) return;
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    setColor(color);
    const lines: string[] = pdf.splitTextToSize(safe(text), CONTENT_W);
    for (const line of lines) {
      ensure(lineHeight);
      pdf.text(line, MARGIN, cursor);
      cursor += lineHeight;
    }
    cursor += gap;
  }

  function sectionTitle(text: string) {
    ensure(18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    setColor(FOREST);
    pdf.text(safe(text), MARGIN, cursor);
    cursor += 3;
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.4);
    pdf.line(MARGIN, cursor, MARGIN + CONTENT_W, cursor);
    cursor += 7;
  }

  function rows(entries: { label: string; value: string }[]) {
    /* The labels are the wizard's own questions ("When would you like to
       travel?"), so both columns wrap and the row is as tall as the taller. */
    const labelW = 58;
    for (const entry of entries) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const valueLines: string[] = pdf.splitTextToSize(
        safe(entry.value || "-"),
        CONTENT_W - labelW - 4
      );
      const labelLines: string[] = pdf.splitTextToSize(safe(entry.label), labelW - 6);
      const height = Math.max(valueLines.length, labelLines.length, 1) * 5 + 3.5;
      ensure(height);
      setColor(MUTED);
      pdf.text(labelLines, MARGIN, cursor);
      setColor(CHARCOAL);
      pdf.text(valueLines, MARGIN + labelW, cursor);
      cursor += height;
      pdf.setDrawColor(...RULE);
      pdf.setLineWidth(0.2);
      pdf.line(MARGIN, cursor - 2.5, MARGIN + CONTENT_W, cursor - 2.5);
    }
    cursor += 5;
  }

  function renderItinerary(itinerary: JourneyItinerary) {
    newPage(itinerary.images[0] ?? doc.coverImage);

    /* A full-bleed band: the photograph carries the title rather than sitting
       under it, which is what makes the printed page read as a brochure. */
    const bandH = 62;
    const band = washed(itinerary.images[0], PAGE_W / bandH, "#000000", 0.45);
    if (band) {
      place(band, `band:${itinerary.images[0]}`, 0, 0, PAGE_W, bandH);
    } else {
      pdf.setFillColor(...FOREST);
      pdf.rect(0, 0, PAGE_W, bandH, "F");
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(safe(itinerary.location.toUpperCase()), MARGIN, bandH - 26);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    const heading: string[] = pdf.splitTextToSize(safe(itinerary.title), CONTENT_W);
    pdf.text(heading.slice(0, 2), MARGIN, bandH - 15);

    cursor = bandH + 14;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    setColor(MUTED);
    pdf.text(
      `${safe(doc.labels.bestTimeLabel)}: ${safe(itinerary.bestTime)}    |    ${safe(
        doc.labels.durationLabel
      )}: ${safe(itinerary.duration)}`,
      MARGIN,
      cursor
    );
    cursor += 9;

    paragraph(itinerary.summary, { size: 11, style: "bold" });
    paragraph(itinerary.description, { lineHeight: 5.2 });

    /* Any photographs the band did not use, side by side. */
    const gallery = itinerary.images.slice(1, 3);
    if (gallery.length) {
      const gap = 5;
      const width = gallery.length > 1 ? (CONTENT_W - gap) / 2 : CONTENT_W * 0.6;
      const height = width * 0.68;
      ensure(height + 4);
      gallery.forEach((src, index) => {
        const picture = framed(src, width / height);
        if (picture) {
          const alias = `gallery:${src}:${Math.round(width)}x${Math.round(height)}`;
          place(picture, alias, MARGIN + index * (width + gap), cursor, width, height);
        }
      });
      cursor += height + 6;
    }

    if (itinerary.highlights.length) {
      sectionTitle(doc.labels.highlightsTitle);
      for (const highlight of itinerary.highlights) {
        const thumbSize = 16;
        const thumb = framed(highlight.image, 1);
        const textX = thumb ? MARGIN + thumbSize + 5 : MARGIN + 4;
        const textW = MARGIN + CONTENT_W - textX;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        const noteLines: string[] = highlight.note
          ? pdf.splitTextToSize(safe(highlight.note), textW)
          : [];
        const blockH = Math.max(thumb ? thumbSize : 0, 5 + noteLines.length * 4.6) + 5;
        ensure(blockH);

        if (thumb) {
          place(thumb, `thumb:${highlight.image}`, MARGIN, cursor - 4, thumbSize, thumbSize);
        } else {
          pdf.setFillColor(...FOREST);
          pdf.circle(MARGIN + 1.2, cursor - 1.4, 0.9, "F");
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        setColor(CHARCOAL);
        pdf.text(safe(highlight.name), textX, cursor);
        if (noteLines.length) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          setColor(MUTED);
          pdf.text(noteLines, textX, cursor + 5);
        }
        cursor += blockH;
      }
      cursor += 3;
    }
  }

  /* ---------- cover ---------- */

  const cover = washed(doc.coverImage, PAGE_W / PAGE_H, "#000000", 0.5);
  pdf.setFillColor(...FOREST);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
  if (cover) place(cover, `cover:${doc.coverImage}`, 0, 0, PAGE_W, PAGE_H);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(safe(doc.labels.tagline.toUpperCase()), MARGIN, PAGE_H - 96);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(30);
  const titleLines: string[] = pdf.splitTextToSize(safe(doc.labels.title), CONTENT_W);
  pdf.text(titleLines, MARGIN, PAGE_H - 80);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  let coverCursor = PAGE_H - 80 + titleLines.length * 11 + 6;
  if (doc.preparedFor.trim()) {
    pdf.text(`${safe(doc.labels.preparedFor)}: ${safe(doc.preparedFor)}`, MARGIN, coverCursor);
    coverCursor += 6.5;
  }
  pdf.text(`${safe(doc.labels.preparedOn)}: ${safe(doc.preparedOn)}`, MARGIN, coverCursor);

  /* ---------- summary ---------- */

  newPage(doc.coverImage);
  sectionTitle(doc.labels.summaryTitle);
  rows(doc.summaryRows);

  if (doc.aiRoute.length) {
    sectionTitle(doc.labels.aiRouteTitle);
    doc.aiRoute.forEach((line) => paragraph(line, { gap: 0, lineHeight: 5.5 }));
    cursor += 4;
  }

  /* ---------- one section per selected itinerary ---------- */

  doc.itineraries.forEach(renderItinerary);

  /* ---------- the traveller's details ---------- */

  newPage(doc.coverImage);
  sectionTitle(doc.labels.contactTitle);
  rows(doc.contactRows);

  /* ---------- footers ---------- */

  const pageCount = pdf.getNumberOfPages();
  for (let page = 2; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    setColor(MUTED);
    pdf.text(safe(doc.labels.footer), MARGIN, PAGE_H - 10);
    pdf.text(`${page - 1} / ${pageCount - 1}`, PAGE_W - MARGIN, PAGE_H - 10, { align: "right" });
  }

  return pdf.output("blob");
}
