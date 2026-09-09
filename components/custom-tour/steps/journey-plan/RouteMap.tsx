"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ARRIVAL_POINT } from "@/lib/geo/sriLanka";
import type { PlannedStop } from "@/lib/journey/plan";

const SRI_LANKA_CENTER: [number, number] = [7.6, 80.7];

/** A numbered badge, so the map and the written route read in the same order. */
function numberedPin(order: number) {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#2f4f3a;color:#fff;font:600 13px/1 Helvetica,Arial,sans-serif;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${order}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const arrivalPin = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#8a7a56;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function RouteMap({
  stops,
  arrivalLabel,
}: {
  stops: PlannedStop[];
  arrivalLabel: string;
}) {
  const positions: [number, number][] = [
    [ARRIVAL_POINT.lat, ARRIVAL_POINT.lng],
    ...stops.map((stop): [number, number] => [stop.position.lat, stop.position.lng]),
  ];

  return (
    <MapContainer
      center={SRI_LANKA_CENTER}
      zoom={7}
      scrollWheelZoom={false}
      className="h-80 w-full rounded-xl border border-charcoal/10 lg:h-[560px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {positions.length > 1 && (
        <Polyline positions={positions} pathOptions={{ color: "#2f4f3a", weight: 3 }} />
      )}

      <Marker position={positions[0]} icon={arrivalPin}>
        <Tooltip>{arrivalLabel}</Tooltip>
      </Marker>

      {stops.map((stop) => (
        <Marker
          key={stop.experience.slug}
          position={[stop.position.lat, stop.position.lng]}
          icon={numberedPin(stop.order)}
        >
          <Tooltip>{stop.experience.title}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
