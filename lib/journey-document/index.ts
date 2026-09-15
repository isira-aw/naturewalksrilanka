"use client";

import { collectImageSources, documentFileName, type JourneyDocument } from "./model";
import { downloadBlob, loadImages } from "./assets";
import { renderRouteMap } from "./mapImage";
import { buildJourneyDoc } from "./word";

export type JourneyFileKind = "pdf" | "doc";

export * from "./model";

/**
 * Builds the journey as a PDF or a Word file and saves it to the device.
 * jsPDF is only pulled in when a PDF is actually asked for, so the wizard's
 * bundle does not carry it.
 *
 * The map is rendered once, here, rather than inside each renderer: it costs a
 * round of tile requests, and the PDF and the Word file have to show the
 * traveller the same map they were just looking at on screen.
 */
export async function downloadJourneyDocument(doc: JourneyDocument, kind: JourneyFileKind) {
  const [images, map] = await Promise.all([
    loadImages(collectImageSources(doc)),
    renderRouteMap(doc.mapStops),
  ]);
  const blob =
    kind === "pdf"
      ? await (await import("./pdf")).buildJourneyPdf(doc, images, map)
      : buildJourneyDoc(doc, images, map);
  downloadBlob(blob, documentFileName(doc, kind));
}
