import "server-only";

export type SriLankaLocation = {
  slug: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  activities: string[];
  seasonNote: string;
};

/**
 * Hand-authored coordinates + monsoon/safety notes for the destinations
 * already catalogued in content/en/destinations.json. Kept separate from
 * the translated destination copy so the AI prompt always has real,
 * reviewed coordinates rather than ones the model would have to guess.
 */
export const SRI_LANKA_LOCATIONS: SriLankaLocation[] = [
  { slug: "negombo", name: "Negombo", region: "West Coast", lat: 7.2083, lng: 79.8358, activities: ["culture-history"], seasonNote: "Calm year-round; light SW monsoon showers May-Sep." },
  { slug: "wilpattu", name: "Wilpattu National Park", region: "North Western Province", lat: 8.4593, lng: 80.0392, activities: ["wildlife-safari", "birding"], seasonNote: "Dry zone; best Feb-Sep, some tracks close after heavy Oct-Dec rain." },
  { slug: "anuradhapura", name: "Anuradhapura", region: "North Central Province", lat: 8.3114, lng: 80.4037, activities: ["culture-history"], seasonNote: "Dry zone, hot; brief NE monsoon showers Oct-Jan." },
  { slug: "trincomalee", name: "Trincomalee", region: "Eastern Province", lat: 8.5874, lng: 81.2152, activities: ["beach", "wildlife-safari"], seasonNote: "East-coast season is Apr-Sep; rough seas and NE monsoon rain Oct-Jan." },
  { slug: "sigiriya", name: "Sigiriya", region: "Central Province", lat: 7.9570, lng: 80.7603, activities: ["culture-history", "wildlife-safari"], seasonNote: "Dry zone; best Jan-Sep, humid and occasional storms Oct-Dec." },
  { slug: "polonnaruwa", name: "Polonnaruwa", region: "North Central Province", lat: 7.9403, lng: 81.0188, activities: ["culture-history"], seasonNote: "Dry zone, similar pattern to Sigiriya." },
  { slug: "kandy", name: "Kandy", region: "Central Province", lat: 7.2906, lng: 80.6337, activities: ["culture-history"], seasonNote: "Year-round, but hill roads can see landslide risk in heavy SW monsoon (May-Sep)." },
  { slug: "kithulgala", name: "Kithulgala", region: "Sabaragamuwa Province", lat: 6.9897, lng: 80.4197, activities: ["adventure-sports", "birding"], seasonNote: "Wet zone; river levels highest and rafting best May-Sep, avoid after very heavy rain." },
  { slug: "ella", name: "Ella", region: "Uva Province", lat: 6.8667, lng: 81.0466, activities: ["trekking", "culture-history"], seasonNote: "Hill country; drier Jan-Sep, misty/wet and landslide-prone Oct-Dec." },
  { slug: "yala", name: "Yala National Park", region: "Southern Province", lat: 6.3728, lng: 81.5183, activities: ["wildlife-safari", "birding"], seasonNote: "Best Feb-Jun (dry, game concentrates at water); park closes for maintenance ~Sep-mid Oct." },
  { slug: "sinharaja", name: "Sinharaja Rain Forest", region: "Sabaragamuwa Province", lat: 6.4067, lng: 80.4931, activities: ["birding", "trekking"], seasonNote: "Rainforest, wet year-round; trails hardest and leech activity highest May-Sep and Oct-Jan." },
  { slug: "nuwara-eliya", name: "Nuwara Eliya", region: "Central Highlands", lat: 6.9497, lng: 80.7891, activities: ["birding"], seasonNote: "Cool highlands; wettest Apr-Jun and Oct-Nov, occasional fog reducing visibility." },
  { slug: "horton-plains", name: "Horton Plains National Park", region: "Central Highlands", lat: 6.8021, lng: 80.7998, activities: ["birding", "trekking"], seasonNote: "Best early morning before cloud cover; wettest Apr-Jun and Oct-Nov, cold and exposed." },
  { slug: "tissamaharama", name: "Tissamaharama", region: "Southern Province", lat: 6.2769, lng: 81.2850, activities: ["birding"], seasonNote: "Dry zone, similar pattern to Yala." },
  { slug: "mirissa", name: "Mirissa", region: "Southern Province", lat: 5.9483, lng: 80.4589, activities: ["beach", "culture-history"], seasonNote: "South coast season is Nov-Apr; rough seas and SW monsoon Apr/May-Sep." },
];
