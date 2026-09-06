/**
 * Line icons drawn on a 24-unit grid at a single stroke weight, so a row of
 * them reads as one set rather than a collection of borrowed glyphs. They carry
 * the section meaning that would otherwise need a sentence of copy.
 */
type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Certified guide: a field badge. */
export function BadgeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="9" r="5.25" />
      <path d="m9.4 13.6-1.4 7 4-2.1 4 2.1-1.4-7" />
      <path d="m10 9 1.4 1.5L14 7.6" />
    </Svg>
  );
}

/** Accommodation: a lodge under trees. */
export function LodgeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11.2 12 4l9 7.2" />
      <path d="M5.5 10v9.5h13V10" />
      <path d="M10 19.5v-5h4v5" />
    </Svg>
  );
}

/** Transport: a private vehicle. */
export function VehicleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 16.5v-3.2l1.8-4.6A2 2 0 0 1 6.7 7.5h10.6a2 2 0 0 1 1.9 1.2l1.8 4.6v3.2" />
      <path d="M3 13.3h18" />
      <circle cx="7" cy="16.8" r="1.7" />
      <circle cx="17" cy="16.8" r="1.7" />
    </Svg>
  );
}

/** Itinerary: a route with waypoints. */
export function RouteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6.5" r="2.2" />
      <circle cx="18" cy="17.5" r="2.2" />
      <path d="M8.2 6.5h5.3a3.3 3.3 0 0 1 0 6.6h-3a3.3 3.3 0 0 0 0 6.6h4.3" />
    </Svg>
  );
}

/** Field-trained: binoculars. */
export function BinocularsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 4.5h-2L5 13m9.5-8.5h2L19 13" />
      <path d="M10.8 8.5h2.4v5h-2.4z" />
      <circle cx="6.2" cy="16" r="3.5" />
      <circle cx="17.8" cy="16" r="3.5" />
    </Svg>
  );
}

/** One company: a single point of contact. */
export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12.4c0 3.9-3.6 7-8 7a9.2 9.2 0 0 1-2.6-.4L4 20.5l1.5-3.6A6.7 6.7 0 0 1 4 12.4c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
      <path d="M9 11.5h6M9 14h4" />
    </Svg>
  );
}

/** Leaf, for conservation and nature notes. */
export function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 19c-1.5-6.5 2-12 14-13 1 9-3.5 14-10 14-1.6 0-3-.4-4-1Z" />
      <path d="M5 19c2-4.5 5-7.5 9.5-9.5" />
    </Svg>
  );
}
