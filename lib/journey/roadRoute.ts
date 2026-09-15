"use client";

import type { LatLng } from "@/lib/geo/sriLanka";

/**
 * The road the car actually takes between the stops.
 *
 * The plan itself is arithmetic on straight lines (see `roadEstimate`): enough
 * to order the stops and set expectations, but drawn on a map it runs through
 * hills, reservoirs and the middle of national parks. So the map asks OSRM —
 * the routing engine behind openstreetmap.org's own directions — for the real
 * driving geometry, and traces that instead.
 *
 * Everything here degrades to nothing. A blocked, slow or unreachable router
 * resolves to `null` and the caller falls back to the straight line, so no
 * plan, document or message ever depends on the request having succeeded.
 */

const ENDPOINT = "https://router.project-osrm.org/route/v1/driving/";
const TIMEOUT_MS = 8000;

export type RoadRoute = {
  /** The whole drive, airport through the last stop, as points to draw. */
  geometry: LatLng[];
  /** One entry per leg, in route order, as the road measures it. */
  legs: { km: number; minutes: number }[];
};

/* Two travellers with the same stops get the same route, and the map, the PDF
   and the Word file all share one request rather than making three. */
const cache = new Map<string, Promise<RoadRoute | null>>();

function cacheKey(points: LatLng[]) {
  return points.map((point) => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`).join(";");
}

export function fetchRoadRoute(points: LatLng[]): Promise<RoadRoute | null> {
  if (points.length < 2) return Promise.resolve(null);

  const key = cacheKey(points);
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = requestRoute(points).then((route) => {
    // A failure is not worth remembering: the next step may well be online.
    if (!route) cache.delete(key);
    return route;
  });
  cache.set(key, pending);
  return pending;
}

type OsrmResponse = {
  routes?: {
    geometry?: { coordinates?: [number, number][] };
    legs?: { distance?: number; duration?: number }[];
  }[];
};

async function requestRoute(points: LatLng[]): Promise<RoadRoute | null> {
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = `${ENDPOINT}${coordinates}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const body = (await response.json()) as OsrmResponse;
    const route = body.routes?.[0];
    const line = route?.geometry?.coordinates;
    if (!Array.isArray(line) || line.length < 2) return null;

    return {
      // GeoJSON is [longitude, latitude]; everything else here is the reverse.
      geometry: line.map(([lng, lat]) => ({ lat, lng })),
      legs: (route?.legs ?? []).map((leg) => ({
        km: Math.round((leg.distance ?? 0) / 1000),
        minutes: Math.round((leg.duration ?? 0) / 60),
      })),
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
