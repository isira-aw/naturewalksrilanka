"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ItineraryOption } from "@/lib/ai/itinerarySchema";

const SRI_LANKA_CENTER: [number, number] = [7.6, 80.7];

function pin(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const candidatePin = pin("#8a7a56");
const selectedPin = pin("#2f4f3a");

export function SriLankaMap({
  candidates,
  selectedRoute,
}: {
  candidates: ItineraryOption[];
  selectedRoute: ItineraryOption[];
}) {
  const routePositions: [number, number][] = selectedRoute.map((opt) => [opt.lat, opt.lng]);

  return (
    <MapContainer
      center={SRI_LANKA_CENTER}
      zoom={7}
      scrollWheelZoom={false}
      className="h-72 w-full rounded-xl border border-charcoal/10"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routePositions.length > 1 && (
        <Polyline positions={routePositions} pathOptions={{ color: "#2f4f3a", weight: 3 }} />
      )}
      {selectedRoute.map((opt) => (
        <Marker key={`selected-${opt.slug}`} position={[opt.lat, opt.lng]} icon={selectedPin}>
          <Tooltip>{opt.name}</Tooltip>
        </Marker>
      ))}
      {candidates.map((opt) => (
        <Marker key={`candidate-${opt.slug}`} position={[opt.lat, opt.lng]} icon={candidatePin}>
          <Tooltip>{opt.name}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
