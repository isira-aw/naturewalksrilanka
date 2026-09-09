"use client";

import { SRI_LANKA_OUTLINE, type LatLng } from "@/lib/geo/sriLanka";

/**
 * Draws the route on a map of Sri Lanka, as a canvas both documents can embed.
 *
 * The wizard shows a real slippy map, but its tiles are fetched from a tile
 * server — they cannot be read back out of the page (a cross-origin canvas is
 * tainted), and a document should not depend on a third party being reachable
 * at the moment somebody presses Download. So the printed map is drawn here
 * from the coastline in `lib/geo/sriLanka.ts`: no network, no tainting, and it
 * looks the same every time.
 */

const PAPER = "#FDFCF9";
const LAND = "#E8E6DE";
const COAST = "#C9C5B8";
const FOREST = "#1F3D2A";
const CLAY = "#8A7A56";

export type MapStop = { lat: number; lng: number; label: string };

export function drawRouteMap(
  stops: MapStop[],
  start: LatLng,
  { width = 900, height = 1200 }: { width?: number; height?: number } = {}
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  /* One scale for both axes, so the island keeps its shape, and a margin wide
     enough that a marker on the coast is not clipped in half. */
  const lats = SRI_LANKA_OUTLINE.map(([lat]) => lat);
  const lngs = SRI_LANKA_OUTLINE.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const margin = Math.round(Math.min(width, height) * 0.06);
  const scale = Math.min(
    (width - margin * 2) / (maxLng - minLng),
    (height - margin * 2) / (maxLat - minLat)
  );
  const offsetX = (width - (maxLng - minLng) * scale) / 2;
  const offsetY = (height - (maxLat - minLat) * scale) / 2;

  const project = ({ lat, lng }: LatLng): [number, number] => [
    offsetX + (lng - minLng) * scale,
    // Latitude grows northward and canvas y grows downward.
    offsetY + (maxLat - lat) * scale,
  ];

  // ---- the island ----
  context.beginPath();
  SRI_LANKA_OUTLINE.forEach(([lat, lng], index) => {
    const [x, y] = project({ lat, lng });
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = LAND;
  context.fill();
  context.strokeStyle = COAST;
  context.lineWidth = Math.max(1, width / 450);
  context.stroke();

  // ---- the route ----
  const points = [start, ...stops].map(project);

  if (points.length > 1) {
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = FOREST;
    context.lineWidth = Math.max(2, width / 260);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
  }

  // ---- where the journey starts ----
  const [startX, startY] = points[0];
  const startRadius = Math.max(4, width / 150);
  context.beginPath();
  context.arc(startX, startY, startRadius, 0, Math.PI * 2);
  context.fillStyle = CLAY;
  context.fill();
  context.strokeStyle = PAPER;
  context.lineWidth = Math.max(1.5, width / 400);
  context.stroke();

  // ---- numbered stops ----
  const radius = Math.max(9, width / 60);
  const fontSize = Math.round(radius * 1.15);

  stops.forEach((stop, index) => {
    const [x, y] = points[index + 1];

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = FOREST;
    context.fill();
    context.strokeStyle = PAPER;
    context.lineWidth = Math.max(2, width / 350);
    context.stroke();

    context.fillStyle = "#FFFFFF";
    context.font = `600 ${fontSize}px Helvetica, Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(index + 1), x, y + fontSize * 0.05);
  });

  return canvas;
}
