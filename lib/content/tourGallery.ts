/**
 * The bird photography the old site closed every tour page with.
 *
 * All six source pages (`single7`, `single`, `single10`, `single12`,
 * `single16`, `single18`) carried the same six frames, so they are one shared
 * asset set rather than six copies under six folders — which is also why they
 * live here rather than in `content/<locale>/tours.json`: nothing about them
 * varies by tour, and the only translated words on the section are its
 * heading, which comes from `ui.json`.
 *
 * `name` is the alt text. These are the descriptions the photographs were
 * published under; they are not identified to species on the source site, so
 * nothing more specific is claimed here.
 */
export type TourGalleryImage = { src: string; name: string };

export const tourGallery: TourGalleryImage[] = [
  { src: "/images/tours/birds/wood-shrike.jpg", name: "Wood shrike" },
  { src: "/images/tours/birds/barbet.jpg", name: "Barbet" },
  { src: "/images/tours/birds/babbler.jpg", name: "Babbler" },
  { src: "/images/tours/birds/hornbill.jpg", name: "Hornbill" },
  { src: "/images/tours/birds/pied-hornbill.jpg", name: "Pied hornbills" },
  { src: "/images/tours/birds/orange-headed-thrush.jpg", name: "Orange-headed thrush" },
];
