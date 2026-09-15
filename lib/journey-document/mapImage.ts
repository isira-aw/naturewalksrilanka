"use client";

import { ARRIVAL_POINT, type LatLng } from "@/lib/geo/sriLanka";
import { fetchRoadRoute } from "@/lib/journey/roadRoute";
import { drawRouteMap, type MapStop } from "./mapCanvas";

/**
 * The printed map, built from the same tiles the wizard shows.
 *
 * The documents used to carry a hand-drawn outline of the island. It never
 * looked like the map the traveller had just been reading, and a coastline with
 * six dots on it does not tell anyone where they are going. So this fetches the
 * OpenStreetMap tiles for the route's own bounding box, draws the road geometry
 * and the numbered stops over them, and hands back a canvas both documents
 * embed — what is on screen is what comes out of the PDF.
 *
 * Tiles come through `fetch` rather than an `<img>` so the canvas is never
 * tainted and can still be read back out. If the tile server cannot be reached
 * the drawn outline is still there as a fallback: a map of some kind always
 * ends up in the file.
 */

const TILE_SIZE = 256;
const MIN_ZOOM = 6;
const MAX_ZOOM = 12;
/** Politeness towards a free tile server, and a bound on the file size. */
const MAX_TILES = 80;
const PARALLEL_TILES = 6;

/** Room around the route, so a pin on the coast is not against the edge. */
const PADDING = 56;
const MAX_WIDTH = 1100;
const MAX_HEIGHT = 1500;
/** A route down one coast is a ribbon; widen it so the page reads as a map. */
const MIN_ASPECT = 0.62;

const FOREST = "#1F3D2A";
const CLAY = "#8A7A56";
const PAPER = "#FDFCF9";

const tileCache = new Map<string, CanvasImageSource | null>();

/* ---------- Web Mercator, the projection every tile server uses ---------- */

function worldSize(zoom: number) {
  return TILE_SIZE * 2 ** zoom;
}

function project({ lat, lng }: LatLng, zoom: number): [number, number] {
  const size = worldSize(zoom);
  const latRad = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
  const x = ((lng + 180) / 360) * size;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * size;
  return [x, y];
}

/* ---------- tiles ---------- */

async function loadTile(zoom: number, x: number, y: number): Promise<CanvasImageSource | null> {
  const key = `${zoom}/${x}/${y}`;
  const cached = tileCache.get(key);
  if (cached !== undefined) return cached;

  let tile: CanvasImageSource | null = null;
  try {
    const response = await fetch(`https://tile.openstreetmap.org/${key}.png`);
    if (response.ok) {
      const blob = await response.blob();
      tile =
        typeof createImageBitmap === "function"
          ? await createImageBitmap(blob)
          : await imageFromBlob(blob);
    }
  } catch {
    tile = null;
  }

  tileCache.set(key, tile);
  return tile;
}

/** For Safari versions without `createImageBitmap`. A blob URL never taints. */
function imageFromBlob(blob: Blob) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/** Runs the tile requests a few at a time rather than eighty at once. */
async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(run));
  }
}

/* ---------- the map ---------- */

export async function renderRouteMap(
  stops: MapStop[],
  start: LatLng = ARRIVAL_POINT
): Promise<HTMLCanvasElement | null> {
  if (stops.length === 0) return null;

  const waypoints: LatLng[] = [start, ...stops];
  const road = await fetchRoadRoute(waypoints);
  const line = road?.geometry ?? waypoints;

  const tiled = await tiledMap(waypoints, line, stops);
  // No tiles — the drawn island is still a map, and it needs no network.
  return tiled ?? drawRouteMap(stops, start, { route: road?.geometry });
}

async function tiledMap(
  waypoints: LatLng[],
  line: LatLng[],
  stops: MapStop[]
): Promise<HTMLCanvasElement | null> {
  const points = [...line, ...waypoints];

  /* The largest zoom whose picture of the route still fits the page and does
     not ask the tile server for more than a page's worth of tiles. */
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const projected = points.map((point) => project(point, zoom));
    const xs = projected.map(([x]) => x);
    const ys = projected.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const height = Math.round(maxY - minY + PADDING * 2);
    const width = Math.round(Math.max(maxX - minX + PADDING * 2, height * MIN_ASPECT));
    if (width > MAX_WIDTH || height > MAX_HEIGHT) continue;

    const originX = (minX + maxX) / 2 - width / 2;
    const originY = (minY + maxY) / 2 - height / 2;

    const firstX = Math.floor(originX / TILE_SIZE);
    const lastX = Math.floor((originX + width) / TILE_SIZE);
    const firstY = Math.floor(originY / TILE_SIZE);
    const lastY = Math.floor((originY + height) / TILE_SIZE);
    const count = (lastX - firstX + 1) * (lastY - firstY + 1);
    if (count > MAX_TILES) continue;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.fillStyle = PAPER;
    context.fillRect(0, 0, width, height);

    const coords: { x: number; y: number }[] = [];
    for (let x = firstX; x <= lastX; x += 1) {
      for (let y = firstY; y <= lastY; y += 1) coords.push({ x, y });
    }

    let drawn = 0;
    await inBatches(coords, PARALLEL_TILES, async ({ x, y }) => {
      const tile = await loadTile(zoom, x, y);
      if (!tile) return;
      context.drawImage(tile, x * TILE_SIZE - originX, y * TILE_SIZE - originY, TILE_SIZE, TILE_SIZE);
      drawn += 1;
    });

    // A map with holes in it is worse than the drawn island.
    if (drawn < coords.length * 0.8) return null;

    const toCanvas = (point: LatLng): [number, number] => {
      const [x, y] = project(point, zoom);
      return [x - originX, y - originY];
    };

    drawRoute(context, line.map(toCanvas));
    drawMarkers(context, toCanvas(waypoints[0]), stops.map((stop) => toCanvas(stop)));
    drawAttribution(context, width, height);

    return canvas;
  }

  return null;
}

/** A white casing under the line, the way a road atlas prints a route. */
function drawRoute(context: CanvasRenderingContext2D, points: [number, number][]) {
  if (points.length < 2) return;

  context.lineJoin = "round";
  context.lineCap = "round";

  for (const [width, color] of [
    [9, "rgba(255,255,255,0.85)"],
    [4.5, FOREST],
  ] as const) {
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.lineWidth = width;
    context.strokeStyle = color;
    context.stroke();
  }
}

function drawMarkers(
  context: CanvasRenderingContext2D,
  start: [number, number],
  stops: [number, number][]
) {
  context.beginPath();
  context.arc(start[0], start[1], 8, 0, Math.PI * 2);
  context.fillStyle = CLAY;
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = "#FFFFFF";
  context.stroke();

  const radius = 15;
  stops.forEach(([x, y], index) => {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = FOREST;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = "#FFFFFF";
    context.stroke();

    context.fillStyle = "#FFFFFF";
    context.font = `600 ${Math.round(radius * 1.1)}px Helvetica, Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(index + 1), x, y + 1);
  });
}

/** Required wherever OpenStreetMap tiles are shown, printed page included. */
function drawAttribution(context: CanvasRenderingContext2D, width: number, height: number) {
  const text = "© OpenStreetMap contributors";
  context.font = "12px Helvetica, Arial, sans-serif";
  const box = context.measureText(text).width + 14;

  context.fillStyle = "rgba(255,255,255,0.78)";
  context.fillRect(width - box - 6, height - 26, box, 20);

  context.fillStyle = "#3A3A36";
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillText(text, width - 13, height - 16);
}
