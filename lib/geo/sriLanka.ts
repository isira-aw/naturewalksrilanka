/**
 * Sri Lanka's shape, its provinces and the places the tours visit, in one
 * client-safe module.
 *
 * The journey plan has to answer two questions the content files cannot: where
 * on the island an itinerary happens, and what order a sensible drive would
 * visit them in. Both need coordinates, so every province carries a centroid
 * and the places that appear in itinerary locations carry their own point. A
 * province centroid is always available, which is what makes the ordering
 * work for an itinerary whose location text names somewhere not in this list.
 */

export type LatLng = { lat: number; lng: number };

/** The nine provinces, as an admin picks them. */
export const PROVINCES = [
  { id: "central", label: "Central Province", lat: 7.29, lng: 80.64 },
  { id: "eastern", label: "Eastern Province", lat: 7.75, lng: 81.5 },
  { id: "north-central", label: "North Central Province", lat: 8.2, lng: 80.7 },
  { id: "northern", label: "Northern Province", lat: 9.35, lng: 80.25 },
  { id: "north-western", label: "North Western Province", lat: 7.75, lng: 80.0 },
  { id: "sabaragamuwa", label: "Sabaragamuwa Province", lat: 6.72, lng: 80.4 },
  { id: "southern", label: "Southern Province", lat: 6.15, lng: 80.6 },
  { id: "uva", label: "Uva Province", lat: 6.85, lng: 81.1 },
  { id: "western", label: "Western Province", lat: 6.9, lng: 80.0 },
] as const;

export type ProvinceId = (typeof PROVINCES)[number]["id"];

export const PROVINCE_IDS = PROVINCES.map((p) => p.id) as [ProvinceId, ...ProvinceId[]];

export function isProvince(value: string): value is ProvinceId {
  return (PROVINCE_IDS as readonly string[]).includes(value);
}

export function provinceLabel(id: ProvinceId) {
  return PROVINCES.find((p) => p.id === id)?.label ?? id;
}

export function provinceCenter(id: ProvinceId): LatLng {
  const province = PROVINCES.find((p) => p.id === id) ?? PROVINCES[0];
  return { lat: province.lat, lng: province.lng };
}

/**
 * Named places, so an itinerary set in "Sinharaja Rain Forest, Sabaragamuwa"
 * plots on the rainforest rather than in the middle of the province. Matched
 * loosely against the itinerary's location text — first hit wins, so the more
 * specific names are listed before the towns they sit near.
 */
export const PLACES: { name: string; lat: number; lng: number }[] = [
  { name: "sinharaja", lat: 6.4, lng: 80.45 },
  { name: "horton plains", lat: 6.8, lng: 80.8 },
  { name: "knuckles", lat: 7.42, lng: 80.79 },
  { name: "adam's peak", lat: 6.81, lng: 80.5 },
  { name: "kitulgala", lat: 6.99, lng: 80.41 },
  { name: "kithulgala", lat: 6.99, lng: 80.41 },
  { name: "udawalawe", lat: 6.47, lng: 80.89 },
  { name: "wilpattu", lat: 8.45, lng: 80.05 },
  { name: "minneriya", lat: 8.03, lng: 80.9 },
  { name: "kaudulla", lat: 8.16, lng: 80.93 },
  { name: "bundala", lat: 6.19, lng: 81.25 },
  { name: "kumana", lat: 6.6, lng: 81.68 },
  { name: "wasgamuwa", lat: 7.72, lng: 80.93 },
  { name: "yala", lat: 6.37, lng: 81.5 },
  { name: "sigiriya", lat: 7.957, lng: 80.76 },
  { name: "dambulla", lat: 7.86, lng: 80.65 },
  { name: "polonnaruwa", lat: 7.94, lng: 81.0 },
  { name: "anuradhapura", lat: 8.31, lng: 80.4 },
  { name: "mihintale", lat: 8.35, lng: 80.51 },
  { name: "kandy", lat: 7.29, lng: 80.63 },
  { name: "nuwara eliya", lat: 6.97, lng: 80.78 },
  { name: "ella", lat: 6.87, lng: 81.05 },
  { name: "haputale", lat: 6.77, lng: 80.95 },
  { name: "badulla", lat: 6.99, lng: 81.06 },
  { name: "arugam bay", lat: 6.84, lng: 81.83 },
  { name: "trincomalee", lat: 8.57, lng: 81.23 },
  { name: "batticaloa", lat: 7.71, lng: 81.7 },
  { name: "jaffna", lat: 9.66, lng: 80.01 },
  { name: "mannar", lat: 8.98, lng: 79.91 },
  { name: "kalpitiya", lat: 8.23, lng: 79.76 },
  { name: "puttalam", lat: 8.03, lng: 79.83 },
  { name: "chilaw", lat: 7.58, lng: 79.8 },
  { name: "negombo", lat: 7.21, lng: 79.84 },
  { name: "colombo", lat: 6.93, lng: 79.85 },
  { name: "bentota", lat: 6.42, lng: 79.99 },
  { name: "hikkaduwa", lat: 6.14, lng: 80.1 },
  { name: "galle", lat: 6.03, lng: 80.22 },
  { name: "unawatuna", lat: 6.01, lng: 80.25 },
  { name: "mirissa", lat: 5.95, lng: 80.46 },
  { name: "matara", lat: 5.95, lng: 80.55 },
  { name: "tangalle", lat: 6.02, lng: 80.79 },
  { name: "hambantota", lat: 6.12, lng: 81.12 },
  { name: "tissamaharama", lat: 6.28, lng: 81.29 },
  { name: "ratnapura", lat: 6.68, lng: 80.4 },
  { name: "kalutara", lat: 6.58, lng: 79.96 },
];

/** Where a journey starts and ends: the international airport. */
export const ARRIVAL_POINT: LatLng & { name: string } = {
  name: "Bandaranaike International Airport",
  lat: 7.18,
  lng: 79.88,
};

/**
 * Best coordinate for an itinerary: a named place inside its location text if
 * there is one, otherwise the centre of the province the admin filed it under.
 */
export function locateItinerary(location: string, province: ProvinceId): LatLng {
  const haystack = location.toLowerCase();
  const place = PLACES.find((candidate) => haystack.includes(candidate.name));
  if (place) return { lat: place.lat, lng: place.lng };
  return provinceCenter(province);
}

const EARTH_RADIUS_KM = 6371;

export function distanceKm(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Sri Lanka's roads wind through hills, so straight-line kilometres badly
 * understate a drive. 1.35x and 42 km/h is the ratio that matches the
 * operator's own transfer times closely enough to set expectations.
 */
export function roadEstimate(from: LatLng, to: LatLng) {
  const straight = distanceKm(from, to);
  const km = Math.round(straight * 1.35);
  const minutes = Math.round((km / 42) * 60);
  return { km, minutes };
}

/**
 * Orders stops into a drivable route: start from the airport, then repeatedly
 * take the nearest stop not yet visited. Nearest-neighbour is not the shortest
 * possible route, but on an island this size it produces the sensible
 * clockwise or anticlockwise loop a guide would actually drive, and — unlike
 * anything cleverer — it is stable, so the same selection always yields the
 * same running order.
 */
export function orderByRoute<T>(stops: T[], at: (stop: T) => LatLng): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let current: LatLng = ARRIVAL_POINT;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((stop, index) => {
      const d = distanceKm(current, at(stop));
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = at(next);
  }

  return ordered;
}

/**
 * A simplified coastline, traced clockwise from Point Pedro. Enough to read as
 * Sri Lanka on a printed page, which is all the documents need — the wizard
 * itself draws a real slippy map.
 */
export const SRI_LANKA_OUTLINE: [number, number][] = [
  [9.83, 80.23], [9.78, 80.36], [9.6, 80.45], [9.35, 80.55], [9.05, 80.75],
  [8.8, 81.05], [8.62, 81.18], [8.57, 81.28], [8.35, 81.38], [8.1, 81.42],
  [7.72, 81.71], [7.4, 81.81], [7.1, 81.86], [6.87, 81.84], [6.6, 81.66],
  [6.4, 81.51], [6.28, 81.31], [6.12, 81.12], [6.02, 80.85], [5.93, 80.55],
  [5.93, 80.35], [6.03, 80.21], [6.25, 80.05], [6.5, 79.98], [6.93, 79.84],
  [7.21, 79.82], [7.58, 79.79], [8.03, 79.81], [8.23, 79.72], [8.4, 79.93],
  [8.75, 80.03], [8.98, 79.88], [9.12, 80.05], [9.35, 80.08], [9.66, 79.99],
  [9.8, 80.09],
];
