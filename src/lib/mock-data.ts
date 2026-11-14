import type {
  ActivityItem,
  Announcement,
  Area,
  LatLng,
  Place,
  Report,
  ReportCategory,
  ReportLogEntry,
  Roadblock,
  Station,
  TravelMode,
  User,
} from "./types";
import { SEED_SEGMENTS } from "./seed-segments";

/**
 * Mock data is authored relative to this date. On the client the store
 * rebuilds the seed shifted to "today" so countdowns and KPIs stay meaningful.
 */
export const SEED_BASE = "2026-10-29";

export const CONSTRUCTION_PHASES = [
  "Site Survey",
  "Utility Relocation",
  "Piling Works",
  "Pier Construction",
  "Deck Launching",
  "Road Reinstatement",
  "Completed",
] as const;

/** Traffic a roadblock can affect, in display order. */
export const TRAVEL_MODES: { value: TravelMode; label: string; short: string }[] = [
  { value: "car", label: "Cars", short: "Car" },
  { value: "motorcycle", label: "Motorcycles", short: "Motorcycle" },
  { value: "pedestrian", label: "Pedestrians", short: "Pedestrian" },
];

export const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "inaccurate-status", label: "Inaccurate closure status" },
  { value: "wrong-period", label: "Wrong closure period" },
  { value: "safety-hazard", label: "Safety hazard" },
  { value: "congestion", label: "Heavy congestion" },
  { value: "other", label: "Other" },
];

export const AREAS: Area[] = [
  { id: "penang-sentral", name: "Penang Sentral", lat: 5.3945, lng: 100.3655 },
  { id: "komtar", name: "Komtar", lat: 5.4146, lng: 100.3293 },
  { id: "macallum", name: "Macallum", lat: 5.4035, lng: 100.3345 },
  { id: "jelutong", name: "Jelutong", lat: 5.3885, lng: 100.3225 },
  { id: "gelugor", name: "Gelugor", lat: 5.368, lng: 100.311 },
  { id: "sungai-dua", name: "Sungai Dua", lat: 5.3555, lng: 100.2985 },
  { id: "sungai-nibong", name: "Sungai Nibong", lat: 5.3445, lng: 100.306 },
  { id: "queensbay", name: "Queensbay", lat: 5.333, lng: 100.3065 },
  { id: "bayan-baru", name: "Bayan Baru", lat: 5.3215, lng: 100.2905 },
  { id: "bayan-lepas", name: "Bayan Lepas", lat: 5.2955, lng: 100.265 },
  { id: "batu-maung", name: "Batu Maung", lat: 5.2835, lng: 100.29 },
];

export const PLACES: Place[] = [
  ...AREAS.map((a) => ({ ...a, area: a.name })),
  { id: "airport", name: "Penang International Airport", area: "Bayan Lepas", lat: 5.2971, lng: 100.277 },
  { id: "usm", name: "Universiti Sains Malaysia", area: "Gelugor", lat: 5.3559, lng: 100.3025 },
  { id: "queensbay-mall", name: "Queensbay Mall", area: "Queensbay", lat: 5.3337, lng: 100.3066 },
  { id: "gurney", name: "Gurney Plaza", area: "Pulau Tikus", lat: 5.4375, lng: 100.3095 },
  { id: "spice", name: "SPICE Arena", area: "Bayan Baru", lat: 5.329, lng: 100.286 },
  { id: "penang-hill", name: "Penang Hill Lower Station", area: "Air Itam", lat: 5.424, lng: 100.269 },
  { id: "ferry", name: "Swettenham Pier", area: "George Town", lat: 5.418, lng: 100.344 },
  { id: "jelutong-market", name: "Jelutong Market", area: "Jelutong", lat: 5.393, lng: 100.317 },
  { id: "pulau-tikus", name: "Pulau Tikus", area: "Pulau Tikus", lat: 5.429, lng: 100.315 },
  { id: "air-itam", name: "Air Itam Market", area: "Air Itam", lat: 5.4, lng: 100.278 },
  { id: "fiz", name: "Bayan Lepas Free Industrial Zone", area: "Bayan Lepas", lat: 5.3005, lng: 100.269 },
  { id: "balik-pulau", name: "Balik Pulau", area: "Balik Pulau", lat: 5.35, lng: 100.234 },
];

/** Named road anchor points, used to label the roads a suggested route travels on. */
export const ROAD_ANCHORS: (LatLng & { name: string })[] = [
  { name: "Lebuhraya Tun Dr Lim Chong Eu", lat: 5.405, lng: 100.338 },
  { name: "Lebuhraya Tun Dr Lim Chong Eu", lat: 5.385, lng: 100.327 },
  { name: "Lebuhraya Tun Dr Lim Chong Eu", lat: 5.36, lng: 100.318 },
  { name: "Lebuhraya Tun Dr Lim Chong Eu", lat: 5.34, lng: 100.31 },
  { name: "Lebuhraya Tun Dr Lim Chong Eu", lat: 5.32, lng: 100.302 },
  { name: "Jalan Sultan Azlan Shah", lat: 5.346, lng: 100.3 },
  { name: "Jalan Sultan Azlan Shah", lat: 5.335, lng: 100.295 },
  { name: "Jalan Bayan Lepas", lat: 5.305, lng: 100.275 },
  { name: "Jalan Bayan Lepas", lat: 5.315, lng: 100.285 },
  { name: "Jalan Masjid Negeri", lat: 5.385, lng: 100.305 },
  { name: "Jalan Air Itam", lat: 5.402, lng: 100.29 },
  { name: "Jalan Dato Keramat", lat: 5.412, lng: 100.318 },
  { name: "Jalan Burma", lat: 5.425, lng: 100.318 },
  { name: "Jalan Gelugor", lat: 5.373, lng: 100.309 },
  { name: "Jalan Tengah", lat: 5.322, lng: 100.288 },
  { name: "Persiaran Mahsuri", lat: 5.328, lng: 100.283 },
  { name: "Jalan Paya Terubong", lat: 5.38, lng: 100.285 },
  { name: "Jalan Tun Sardon", lat: 5.36, lng: 100.255 },
  { name: "Jalan Teluk Kumbar", lat: 5.29, lng: 100.245 },
  { name: "Jalan Sungai Dua", lat: 5.357, lng: 100.296 },
  { name: "Jalan Magazine", lat: 5.413, lng: 100.326 },
  { name: "Jalan Macallum", lat: 5.41, lng: 100.335 },
  { name: "Jalan Tanjung Tokong", lat: 5.45, lng: 100.3 },
  { name: "Persiaran Gurney", lat: 5.44, lng: 100.31 },
  { name: "Penang Bridge", lat: 5.355, lng: 100.34 },
  { name: "Penang Bridge", lat: 5.358, lng: 100.37 },
  { name: "Jalan Perusahaan", lat: 5.39, lng: 100.38 },
  { name: "Jalan Mayang Pasir", lat: 5.318, lng: 100.292 },
  { name: "Jalan Dato Ismail Hashim", lat: 5.31, lng: 100.296 },
];

/**
 * Mutiara LRT stations, using the line's station codes and names. Positions are
 * approximate; progress, phases and opening dates are indicative.
 */
export const LRT_STATIONS: Station[] = [
  { code: "S31", name: "Penang Sentral", lat: 5.3936, lng: 100.3657, phaseIndex: 2, progress: 28, opening: "Q4 2030", note: "Bored piling for the elevated station beside the Penang Sentral transport hub.", nearby: ["KTM Butterworth", "Sultan Abdul Halim Ferry Terminal", "Rapid Penang bus terminal (local and interstate express buses)"] },
  { code: "S30", name: "Jalan Bagan Luar", lat: 5.4045, lng: 100.364, phaseIndex: 1, progress: 12, opening: "Q2 2031", provisional: true, note: "Provisional station on the Butterworth side. Utilities are being moved along Jalan Bagan Luar." },
  { code: "S19", name: "Macallum", lat: 5.4062, lng: 100.3378, phaseIndex: 2, progress: 24, opening: "Q4 2030", interchange: true, note: "Where the two routes meet. Station box excavation starts with the Gat Lebuh Macallum closure." },
  { code: "S20", name: "KOMTAR", lat: 5.4146, lng: 100.3293, phaseIndex: 1, progress: 15, opening: "Q2 2031", note: "Underground utilities are being moved before the piers go in beside Jalan Magazine.", nearby: ["KOMTAR bus terminal", "Menara KOMTAR", "George Town UNESCO World Heritage Site"] },
  { code: "S18", name: "Bandar Sri Pinang", lat: 5.3998, lng: 100.3366, phaseIndex: 3, progress: 41, opening: "Q3 2030", note: "Pier columns are going up along the Lim Chong Eu expressway." },
  { code: "S17", name: "Sungai Pinang", lat: 5.3935, lng: 100.3328, phaseIndex: 3, progress: 44, opening: "Q3 2030", note: "Piers beside the Sungai Pinang river mouth; night lane closures on the expressway." },
  { code: "S16", name: "East Jelutong", lat: 5.3858, lng: 100.3287, phaseIndex: 3, progress: 48, opening: "Q2 2030", note: "Pier caps are being cast overnight beside the expressway." },
  { code: "S15", name: "Penang Waterfront", lat: 5.3768, lng: 100.3246, phaseIndex: 3, progress: 52, opening: "Q2 2030", note: "Piers are rising along the waterfront; the footpath is diverted." },
  { code: "S14", name: "Gelugor", lat: 5.3676, lng: 100.3196, phaseIndex: 4, progress: 58, opening: "Q1 2030", note: "Deck segments are being launched near Jalan Akuarium." },
  { code: "S13", name: "Jalan Universiti", lat: 5.36, lng: 100.315, phaseIndex: 4, progress: 61, opening: "Q1 2030", note: "Deck launching between Gelugor and Batu Uban.", nearby: ["Universiti Sains Malaysia (USM)"] },
  { code: "S12", name: "Batu Uban", lat: 5.3532, lng: 100.3118, phaseIndex: 4, progress: 63, opening: "Q1 2030", note: "Station platforms are being formed on the completed viaduct." },
  { code: "S11", name: "Sungai Dua", lat: 5.3482, lng: 100.3082, phaseIndex: 4, progress: 66, opening: "Q1 2030", depot: true, note: "Viaduct links to the depot; roads around Jalan Sungai Dua are being reinstated." },
  { code: "S10", name: "Sungai Nibong", lat: 5.3436, lng: 100.3058, phaseIndex: 2, progress: 36, opening: "Q4 2030", note: "Bored piling between the roundabout and Jalan Tengku Kudin.", nearby: ["Sungai Nibong bus terminal"] },
  { code: "S09", name: "Bukit Jambul", lat: 5.3368, lng: 100.293, phaseIndex: 4, progress: 70, opening: "Q1 2030", note: "Deck segments are in place; station roof works have started." },
  { code: "S08", name: "SPICE", lat: 5.33, lng: 100.2868, phaseIndex: 4, progress: 72, opening: "Q1 2030", note: "Deck launching beside SPICE; water mains have been relocated.", nearby: ["SPICE Arena"] },
  { code: "S07", name: "Jalan Tengah", lat: 5.3228, lng: 100.2888, phaseIndex: 5, progress: 80, opening: "Q4 2029", note: "Viaduct complete; roads around the station are being reinstated." },
  { code: "S06", name: "FIZ North", lat: 5.3125, lng: 100.2945, phaseIndex: 5, progress: 83, opening: "Q4 2029", note: "Station fit-out under way; Jalan Mayang Pasir lanes reopening in stages." },
  { code: "S05", name: "FIZ South", lat: 5.3025, lng: 100.295, phaseIndex: 5, progress: 85, opening: "Q4 2029", note: "Station fit-out under way beside the industrial zone.", nearby: ["Bayan Lepas Free Industrial Zone (FIZ)"] },
  { code: "S04", name: "Sungai Tiram", lat: 5.2935, lng: 100.2862, phaseIndex: 5, progress: 87, opening: "Q4 2029", note: "Viaduct complete; landscaping and road reinstatement under way." },
  { code: "S03", name: "Penang International Airport", lat: 5.2972, lng: 100.2772, phaseIndex: 5, progress: 88, opening: "Q4 2029", note: "Covered walkway to the terminal is being built." },
  { code: "S02", name: "Permatang Damar Laut", lat: 5.28, lng: 100.276, phaseIndex: 4, progress: 74, opening: "Q1 2030", note: "Launching gantry working south of the airport." },
  { code: "A01", name: "PSR-A", lat: 5.261, lng: 100.279, phaseIndex: 2, progress: 30, opening: "Q4 2030", provisional: true, depot: true, note: "Provisional terminus on the southern island, next to the second depot." },
];

/**
 * The line's two routes as station codes in travel order. They meet at
 * Macallum (S19), the interchange.
 */
export const LRT_ROUTES: { id: "main" | "link"; name: string; stations: string[] }[] = [
  {
    id: "main",
    name: "KOMTAR – PSR-A",
    stations: ["S20", "S19", "S18", "S17", "S16", "S15", "S14", "S13", "S12", "S11", "S10", "S09", "S08", "S07", "S06", "S05", "S04", "S03", "S02", "A01"],
  },
  { id: "link", name: "Penang Sentral – Macallum", stations: ["S31", "S30", "S19"] },
];

export const stationByCode = (code: string) => LRT_STATIONS.find((s) => s.code === code);

/** Map polylines for each route. */
export const LRT_LINES: [number, number][][] = LRT_ROUTES.map((r) =>
  r.stations.map((code) => {
    const s = stationByCode(code)!;
    return [s.lat, s.lng] as [number, number];
  }),
);

export const SITE_IMAGES = [
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=900&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=900&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&q=70&auto=format&fit=crop",
];

export const SUBSCRIBER_COUNTS: Record<string, number> = {
  "penang-sentral": 412,
  komtar: 1288,
  macallum: 534,
  jelutong: 903,
  gelugor: 761,
  "sungai-dua": 655,
  "sungai-nibong": 842,
  queensbay: 1104,
  "bayan-baru": 1530,
  "bayan-lepas": 1987,
  "batu-maung": 389,
};

export const CURRENT_USER_ID = "u-aisyah";
export const ADMIN_USER_ID = "u-admin";

/** Other members of the operations team (seed history only; you sign in as ADMIN_USER_ID). */
export const ADMIN_NAMES: Record<string, string> = {
  [ADMIN_USER_ID]: "Ops Admin",
  "u-admin-2": "Farid Hassan",
  "u-admin-3": "Chong Mei Yee",
};
const ADMIN_TEAM_IDS = ["u-admin-2", "u-admin-3", ADMIN_USER_ID];

export type Seed = {
  roadblocks: Roadblock[];
  reports: Report[];
  announcements: Announcement[];
  users: User[];
  activity: ActivityItem[];
};

/**
 * Builds the seed database. `shiftDays` moves every date forward so the data
 * is always "current" relative to the viewer's clock.
 */
export function buildSeed(shiftDays = 0): Seed {
  const base = new Date(`${SEED_BASE}T00:00:00+08:00`).getTime();
  const DAY = 86_400_000;
  /** ISO for `offset` days from the (shifted) base, at hh:mm Malaysia time. */
  const d = (offset: number, hh = 9, mm = 0) =>
    new Date(base + (offset + shiftDays) * DAY + (hh * 60 + mm) * 60_000).toISOString();

  const roadblocks: Roadblock[] = [
    {
      id: "rb-01",
      road: "Lebuhraya Tun Dr Lim Chong Eu",
      areaId: "jelutong",
      lat: 5.388,
      lng: 100.3262,
      closure: "partial",
      modes: ["car", "motorcycle"],
      radiusM: 250,
      status: "active",
      startDate: d(-60),
      endDate: d(120),
      dailyWindow: { start: "22:00", end: "06:00" },
      phaseIndex: 3,
      description: "Two southbound lanes closed overnight for pier cap casting near Jelutong station.",
      detour: "Use Jalan Jelutong → Jalan Masjid Negeri during closure hours.",
      image: SITE_IMAGES[0],
      lastUpdated: d(-1, 18, 30),
    },
    {
      id: "rb-02",
      road: "Jalan Sultan Azlan Shah",
      areaId: "sungai-nibong",
      lat: 5.344,
      lng: 100.3012,
      closure: "partial",
      modes: ["car", "motorcycle", "pedestrian"],
      radiusM: 300,
      status: "active",
      startDate: d(-21),
      endDate: d(45),
      dailyWindow: { start: "08:00", end: "17:00" },
      phaseIndex: 2,
      description: "Daytime lane closures between Sungai Nibong roundabout and Jalan Tengku Kudin for bored piling.",
      detour: "Follow signage to Lebuhraya Tun Dr Lim Chong Eu via Jalan Sungai Nibong.",
      image: SITE_IMAGES[1],
      lastUpdated: d(0, 7, 45),
    },
    {
      id: "rb-03",
      road: "Jalan Bayan Lepas",
      areaId: "bayan-lepas",
      lat: 5.2985,
      lng: 100.27,
      closure: "partial",
      modes: ["car"],
      radiusM: 200,
      status: "active",
      startDate: d(-90),
      endDate: d(30),
      phaseIndex: 4,
      description: "Lane narrowing near FIZ Phase 1 gate for segment launching gantry.",
      detour: "Heavy vehicles divert via Jalan Hilir Sungai Keluang.",
      image: SITE_IMAGES[2],
      lastUpdated: d(-2, 10, 0),
    },
    {
      id: "rb-04",
      road: "Persiaran Mahsuri",
      areaId: "bayan-baru",
      lat: 5.3255,
      lng: 100.287,
      closure: "partial",
      modes: ["car", "pedestrian"],
      radiusM: 150,
      status: "active",
      startDate: d(-10),
      endDate: d(50),
      dailyWindow: { start: "09:00", end: "16:00" },
      phaseIndex: 1,
      description: "Water main relocation; left lane closed in front of SPICE.",
      detour: "Use Jalan Tengah → Jalan Mayang Pasir.",
      image: SITE_IMAGES[3],
      lastUpdated: d(-1, 9, 15),
    },
    {
      id: "rb-05",
      road: "Jalan Sungai Dua",
      areaId: "sungai-dua",
      lat: 5.356,
      lng: 100.298,
      closure: "full",
      modes: ["car", "motorcycle", "pedestrian"],
      radiusM: 200,
      status: "active",
      startDate: d(-75),
      endDate: d(-9),
      phaseIndex: 5,
      description: "Road reinstatement after utility works. Original completion date has passed.",
      detour: "Use Jalan Universiti → Jalan Bukit Gambir.",
      image: SITE_IMAGES[4],
      lastUpdated: d(-12, 16, 0),
    },
    {
      id: "rb-06",
      road: "Jalan Magazine",
      areaId: "komtar",
      lat: 5.4128,
      lng: 100.327,
      closure: "partial",
      modes: ["car", "motorcycle"],
      radiusM: 150,
      status: "active",
      startDate: d(-30),
      endDate: d(90),
      dailyWindow: { start: "23:00", end: "05:00" },
      phaseIndex: 2,
      description: "Night-time lane closure for Komtar interchange piling.",
      detour: "Use Jalan Dr Lim Chwee Leong.",
      image: SITE_IMAGES[0],
      lastUpdated: d(-3, 22, 0),
    },
    {
      id: "rb-07",
      road: "Gat Lebuh Macallum",
      areaId: "macallum",
      lat: 5.406,
      lng: 100.336,
      closure: "full",
      modes: ["car", "motorcycle", "pedestrian"],
      radiusM: 300,
      status: "scheduled",
      startDate: d(7),
      endDate: d(60),
      phaseIndex: 0,
      description: "Upcoming full closure for station box excavation.",
      detour: "Use Lebuhraya Tun Dr Lim Chong Eu.",
      image: SITE_IMAGES[1],
      lastUpdated: d(-4, 11, 0),
    },
    {
      id: "rb-08",
      road: "Jalan Mayang Pasir",
      areaId: "bayan-baru",
      lat: 5.318,
      lng: 100.292,
      closure: "partial",
      modes: ["car", "motorcycle"],
      radiusM: 150,
      status: "active",
      startDate: d(-45),
      endDate: d(-3),
      phaseIndex: 4,
      description: "Deck launching works; right-turn pocket closed.",
      detour: "U-turn at Jalan Dato Ismail Hashim.",
      image: SITE_IMAGES[2],
      lastUpdated: d(-6, 14, 0),
    },
    {
      id: "rb-09",
      road: "Jalan Akuarium",
      areaId: "gelugor",
      lat: 5.3705,
      lng: 100.3125,
      closure: "partial",
      modes: ["pedestrian", "motorcycle"],
      radiusM: 120,
      status: "active",
      startDate: d(-14),
      endDate: d(70),
      dailyWindow: { start: "08:00", end: "17:00" },
      phaseIndex: 3,
      description: "Pier construction; footpath and motorcycle lane closed with temporary traffic management.",
      detour: "Use Jalan Masjid Negeri.",
      image: SITE_IMAGES[3],
      lastUpdated: d(0, 6, 30),
    },
    {
      id: "rb-10",
      road: "Jalan Tengah",
      areaId: "bayan-baru",
      lat: 5.3225,
      lng: 100.2885,
      closure: "partial",
      modes: ["car", "motorcycle"],
      radiusM: 150,
      status: "completed",
      startDate: d(-120),
      endDate: d(-20),
      phaseIndex: 6,
      description: "Works completed and road fully reopened.",
      detour: "—",
      image: SITE_IMAGES[4],
      lastUpdated: d(-20, 17, 0),
    },
  ];

  // Pins sit on the traced road; each roadblock carries its drawn closure segments.
  for (const rb of roadblocks) {
    const seeded = SEED_SEGMENTS[rb.id];
    if (!seeded) continue;
    rb.lat = seeded.pin.lat;
    rb.lng = seeded.pin.lng;
    rb.segments = seeded.segments;
  }

  const r = (
    id: string,
    roadblockId: string,
    userId: string,
    dayOffset: number,
    hh: number,
    category: ReportCategory,
    note: string,
    viewed: boolean,
    extra: Report["entries"] = [],
  ): Report => ({
    id,
    roadblockId,
    userId,
    createdAt: d(dayOffset, hh),
    viewed,
    entries: [
      { at: d(dayOffset, hh), note, category, observedAt: d(dayOffset, hh - 1), images: [] },
      ...extra,
    ],
  });

  const reports: Report[] = [
    r("RPT-1042", "rb-02", CURRENT_USER_ID, -1, 9, "wrong-period", "Road was still closed at 5:40 PM, past the posted 5 PM reopening.", false),
    r("RPT-1031", "rb-03", CURRENT_USER_ID, -8, 14, "inaccurate-status", "Both lanes were open today — closure seems lifted early.", true),
    r("RPT-1050", "rb-05", CURRENT_USER_ID, -2, 11, "inaccurate-status", "Completion date passed but barriers are still up.", false, [
      { at: d(-1, 8), note: "Still closed this morning. Attached photo of barriers.", category: "inaccurate-status", observedAt: d(-1, 7, 30), images: ["barrier-photo.jpg"] },
    ]),
    r("RPT-1055", "rb-01", "u-2", 0, 8, "congestion", "Queue extends to Jelutong toll at night.", false),
    r("RPT-1056", "rb-09", "u-3", 0, 9, "safety-hazard", "Missing reflective cones near the pier site after the bend.", false),
    r("RPT-1057", "rb-02", "u-4", 0, 10, "wrong-period", "Signboard says until 6 PM but app says 5 PM.", false),
    r("RPT-1051", "rb-04", "u-5", -1, 15, "congestion", "Bottleneck in front of SPICE during evening peak.", true),
    r("RPT-1048", "rb-06", "u-2", -3, 23, "other", "Noise from piling past midnight.", true),
    r("RPT-1044", "rb-08", "u-6", -4, 12, "inaccurate-status", "Right-turn pocket reopened already.", false),
    r("RPT-1040", "rb-05", "u-3", -6, 17, "safety-hazard", "Uneven road surface at detour entrance.", true),
    r("RPT-1036", "rb-01", "u-4", -9, 22, "wrong-period", "Closure started at 9 PM, not 10 PM.", true),
    r("RPT-1029", "rb-09", "u-5", -12, 8, "congestion", "School traffic heavily affected.", true),
    r("RPT-1022", "rb-02", "u-6", -16, 13, "safety-hazard", "Pedestrian walkway blocked without alternative.", true),
    r("RPT-1015", "rb-03", "u-2", -20, 10, "other", "Dust from works affecting nearby stalls.", true),
    r("RPT-1009", "rb-08", "u-3", -24, 16, "inaccurate-status", "Pin location is about 200m off.", true),
    r("RPT-1003", "rb-06", "u-4", -28, 21, "congestion", "Gridlock around Komtar on Friday night.", true),
  ];

  // Handling history: viewed reports were opened by someone on the ops team,
  // and a few were flagged for follow-up.
  const FOCUSED = new Set(["RPT-1040", "RPT-1022", "RPT-1051"]);
  reports.forEach((rep, i) => {
    const t0 = new Date(rep.createdAt).getTime();
    const by = (k: number) => {
      const id = ADMIN_TEAM_IDS[k % ADMIN_TEAM_IDS.length];
      return { adminId: id, adminName: ADMIN_NAMES[id] };
    };
    const log: ReportLogEntry[] = [];
    if (rep.viewed) log.push({ at: new Date(t0 + (2 + (i % 4)) * 3_600_000).toISOString(), action: "viewed", ...by(i) });
    if (FOCUSED.has(rep.id)) {
      log.push({ at: new Date(t0 + (5 + (i % 3)) * 3_600_000).toISOString(), action: "focused", ...by(i + 1) });
      rep.focused = true;
    }
    rep.log = log;
  });

  const announcements: Announcement[] = [
    {
      id: "an-1",
      title: "Night closure: Lim Chong Eu southbound",
      body: "Two southbound lanes near Jelutong will be closed nightly from 10 PM to 6 AM for pier cap casting. Please use the signed detour via Jalan Masjid Negeri.",
      date: d(-1, 18),
      periodStart: d(-1),
      periodEnd: d(13),
      priority: "urgent",
      author: "Mutiara Line Ops",
      pdfName: "TMP-Jelutong-Rev3.pdf",
      pdfUrl: "/docs/TMP-Jelutong-Rev3.pdf",
    },
    {
      id: "an-2",
      title: "Gat Lebuh Macallum closure begins next week",
      body: "Full closure for station box excavation starts next week. Expect heavier traffic around Komtar and Jalan C.Y. Choy.",
      date: d(-3, 10),
      periodStart: d(7),
      periodEnd: d(60),
      priority: "important",
      author: "Mutiara Line Ops",
    },
    {
      id: "an-3",
      title: "Community town hall — Bayan Baru",
      body: "Join us at SPICE Convention Centre to learn about construction phasing and traffic plans for Bayan Baru.",
      date: d(-5, 9),
      periodStart: d(4),
      priority: "info",
      author: "Community Relations",
      pdfName: "TownHall-Agenda.pdf",
      pdfUrl: "/docs/TownHall-Agenda.pdf",
    },
    {
      id: "an-4",
      title: "Report response times improved",
      body: "Citizen reports are now reviewed within 24 hours on weekdays. Thank you for helping keep closure data accurate.",
      date: d(-9, 12),
      priority: "info",
      author: "Mutiara Line Ops",
    },
  ];

  const users: User[] = [
    {
      id: CURRENT_USER_ID,
      name: "Aisyah Rahman",
      email: "aisyah.rahman@gmail.com",
      phone: "+60 12-345 6789",
      subscriptions: ["bayan-lepas", "sungai-dua", "bayan-baru"],
      notifications: { email: true, whatsapp: true, sms: false, smartLocation: true },
    },
    {
      id: ADMIN_USER_ID,
      name: "Ops Admin",
      email: "ops.admin@mutiara.example",
      phone: "+60 4-123 4567",
      subscriptions: [],
      notifications: { email: true, whatsapp: false, sms: false, smartLocation: false },
    },
  ];

  const activity: ActivityItem[] = [
    { id: "ac-1", at: d(0, 10), kind: "report", text: "New report RPT-1057 on Jalan Sultan Azlan Shah" },
    { id: "ac-2", at: d(0, 9), kind: "report", text: "New report RPT-1056 on Jalan Akuarium" },
    { id: "ac-3", at: d(0, 7, 45), kind: "post", text: "Updated Jalan Sultan Azlan Shah closure hours" },
    { id: "ac-4", at: d(-1, 18), kind: "announcement", text: "Published “Night closure: Lim Chong Eu southbound”" },
    { id: "ac-5", at: d(-1, 16), kind: "review", text: "Reviewed RPT-1051 (Persiaran Mahsuri)" },
    { id: "ac-6", at: d(-2, 10), kind: "post", text: "Moved to Deck Launching: Jalan Bayan Lepas" },
    { id: "ac-7", at: d(-3, 10), kind: "announcement", text: "Published “Gat Lebuh Macallum closure begins next week”" },
    { id: "ac-8", at: d(-4, 11), kind: "post", text: "Added Gat Lebuh Macallum full closure (scheduled)" },
  ];

  return { roadblocks, reports, announcements, users, activity };
}

export const REPORTER_NAMES: Record<string, string> = {
  [CURRENT_USER_ID]: "Aisyah Rahman",
  "u-2": "Tan Wei Ming",
  "u-3": "Priya Nair",
  "u-4": "Ahmad Faiz",
  "u-5": "Lim Mei Ling",
  "u-6": "Rajesh Kumar",
};

/** Display name for whoever filed a report: a seeded citizen or an account signed up in this browser. */
export function reporterName(userId: string, users: { id: string; name: string }[]): string {
  return users.find((u) => u.id === userId)?.name ?? REPORTER_NAMES[userId] ?? "Citizen";
}
