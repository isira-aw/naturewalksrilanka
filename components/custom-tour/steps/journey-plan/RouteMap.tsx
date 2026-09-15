"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ARRIVAL_POINT } from "@/lib/geo/sriLanka";
import { fetchRoadRoute } from "@/lib/journey/roadRoute";
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

/** Frames the whole drive, rather than the island the drive happens to be on. */
function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [32, 32] });
  }, [map, positions]);

  return null;
}

export function RouteMap({
  stops,
  arrivalLabel,
}: {
  stops: PlannedStop[];
  arrivalLabel: string;
}) {
  /* The route as a string, so everything below re-runs when the journey
     changes rather than every time the plan object is rebuilt. */
  const signature = [ARRIVAL_POINT, ...stops.map((stop) => stop.position)]
    .map(({ lat, lng }) => `${lat},${lng}`)
    .join(";");

  const positions = useMemo<[number, number][]>(
    () =>
      signature.split(";").map((pair) => {
        const [lat, lng] = pair.split(",").map(Number);
        return [lat, lng];
      }),
    [signature]
  );

  /* The line starts as the straight one and becomes the road as soon as the
     router answers: a traveller reading a plan should see the drive they will
     actually make, not a rope laid across the hills. If the router never
     answers — offline, blocked, too slow — the straight line simply stays.

     The answer is kept with the route it belongs to, so changing the journey
     falls straight back to the straight line rather than showing the roads of
     the journey before it. */
  const [answer, setAnswer] = useState<{ route: string; line: [number, number][] } | null>(null);
  const road = answer?.route === signature ? answer.line : null;

  useEffect(() => {
    let current = true;

    void fetchRoadRoute(positions.map(([lat, lng]) => ({ lat, lng }))).then((route) => {
      if (!current || !route) return;
      setAnswer({ route: signature, line: route.geometry.map(({ lat, lng }) => [lat, lng]) });
    });

    return () => {
      current = false;
    };
  }, [positions, signature]);

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

      <FitRoute positions={road ?? positions} />

      {positions.length > 1 && (
        <Polyline
          positions={road ?? positions}
          /* Dashed while it is still only an estimate of the way round. Every
             key is always set: Leaflet restyles from what it is given, so a
             property left out keeps the value it had before. */
          pathOptions={{
            color: "#2f4f3a",
            weight: road ? 4 : 3,
            opacity: road ? 1 : 0.75,
            dashArray: road ? undefined : "6 8",
          }}
        />
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
