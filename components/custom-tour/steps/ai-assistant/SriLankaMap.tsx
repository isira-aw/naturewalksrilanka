"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ItineraryOption } from "@/lib/ai/itinerarySchema";

const SRI_LANKA_CENTER: [number, number] = [7.6, 80.7];

function pin(color: string, size = 14) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const candidatePin = pin("#8a7a56");
const selectedPin = pin("#2f4f3a");

export function SriLankaMap({
  candidates,
  selectedRoute,
  hoveredSlug,
}: {
  candidates: ItineraryOption[];
  selectedRoute: ItineraryOption[];
  hoveredSlug?: string | null;
}) {
  const routePositions: [number, number][] = selectedRoute.map((opt) => [opt.lat, opt.lng]);
  const hoveredPin = pin("#2f4f3a", 22);

  return (
    <MapContainer
      center={SRI_LANKA_CENTER}
      zoom={7}
      scrollWheelZoom={false}
      className="h-72 w-full rounded-xl border border-charcoal/10 lg:h-[480px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routePositions.length > 1 && (
        <Polyline positions={routePositions} pathOptions={{ color: "#2f4f3a", weight: 3 }} />
      )}
      {selectedRoute.map((opt, index) => (
        <Marker
          key={`selected-${index}-${opt.slug}`}
          position={[opt.lat, opt.lng]}
          icon={opt.slug === hoveredSlug ? hoveredPin : selectedPin}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} className="!text-xs">
            {opt.name}
          </Tooltip>
        </Marker>
      ))}
      {candidates.map((opt, index) => (
        <Marker
          key={`candidate-${index}-${opt.slug}`}
          position={[opt.lat, opt.lng]}
          icon={opt.slug === hoveredSlug ? hoveredPin : candidatePin}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} className="!text-xs">
            {opt.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
