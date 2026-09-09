"use client";

import { collectImageSources, documentFileName, type JourneyDocument } from "./model";
import { downloadBlob, loadImages } from "./assets";
import { buildJourneyDoc } from "./word";

export type JourneyFileKind = "pdf" | "doc";

export * from "./model";

/**
 * Builds the journey as a PDF or a Word file and saves it to the device.
 * jsPDF is only pulled in when a PDF is actually asked for, so the wizard's
 * bundle does not carry it.
 */
export async function downloadJourneyDocument(doc: JourneyDocument, kind: JourneyFileKind) {
  const images = await loadImages(collectImageSources(doc));
  const blob =
    kind === "pdf"
      ? await (await import("./pdf")).buildJourneyPdf(doc, images)
      : buildJourneyDoc(doc, images);
  downloadBlob(blob, documentFileName(doc, kind));
}
